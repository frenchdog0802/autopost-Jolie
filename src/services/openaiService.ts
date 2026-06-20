import OpenAI from 'openai';
import type { RuntimeConfig } from '../config/index.js';
import type { CaptionSet, IAIService } from '../types/index.js';
import { AIServiceError } from '../types/errors.js';
import { createChildLogger } from '../utils/logger.js';
import { validateCaptionSet } from '../utils/validateCaptionSet.js';
import { validateDishList } from '../utils/validateDishList.js';

const DISH_RECOGNITION_PROMPT = `你是一位專業的餐飲圖片辨識專家，擅長辨識各類菜餚。請仔細分析圖片中的食物。

辨識規則：
- 只辨識主菜（主要料理），排除：飲料、湯品、配菜、醬料、餐具、盤飾
- 依圖片實際呈現數量辨識，最多 5 道
- 菜名使用具體描述性的繁體中文，例如「紅燒獅子頭」而非「肉」，「清炒蝦仁」而非「蝦」
- 若圖片模糊或無法辨識食物，回傳空陣列 { "dishes": [] }
- 回傳格式：嚴格 JSON，不含任何 markdown、code block 或額外說明

回傳格式：
{ "dishes": ["菜名1", "菜名2", ...] }`;

const CAPTION_SYSTEM_PROMPT = `你是一位社群媒體文案專家。根據使用者提供的已確認菜色，為以下三個平台各自生成一則貼文文案。
規則：
- 菜色名稱以使用者提供的清單為準，不可自行更改或新增
- 語言：繁體中文為主，可自然融入英文 hashtag
- 回傳格式：嚴格 JSON，不含任何 markdown 或額外說明
- 每個平台都必須有獨立的 caption 與 hashtags 欄位；hashtags 不可寫在 caption 裡
- Instagram：活潑、有個性，適合年輕族群，附 5-10 個 hashtag
- Facebook：親切自然，適合廣泛年齡層，附 3-5 個 hashtag
- Threads：簡短口語，140 字以內

回傳格式：
{
  "instagram": { "caption": "...", "hashtags": "#tag1 #tag2 ..." },
  "facebook":  { "caption": "...", "hashtags": "#tag1 #tag2 ..." },
  "threads":   { "caption": "...", "hashtags": "#tag1 #tag2 ..." }
}`;

export interface OpenAIServiceDeps {
  config: Pick<RuntimeConfig, 'OPENAI_API_KEY'>;
  client?: OpenAI;
}

/**
 * OpenAI Vision service for dish recognition and multi-platform caption generation.
 */
export class OpenAIService implements IAIService {
  private readonly client: OpenAI;
  private readonly log = createChildLogger({ service: 'openai' });

  constructor(deps: OpenAIServiceDeps) {
    this.client =
      deps.client ??
      new OpenAI({
        apiKey: deps.config.OPENAI_API_KEY,
      });
  }

  async recognizeDishes(imageUrl: string): Promise<string[]> {
    try {
      return await this.recognizeDishesWithRetry(imageUrl);
    } catch (error) {
      this.log.error({ err: error, imageUrl }, 'Dish recognition failed');

      if (error instanceof AIServiceError) {
        throw error;
      }

      throw new AIServiceError('AI dish recognition failed');
    }
  }

  async generateCaptions(
    imageUrl: string,
    dishes: string[],
  ): Promise<CaptionSet> {
    try {
      return await this.generateCaptionsWithRetry(imageUrl, dishes);
    } catch (error) {
      this.log.error({ err: error, imageUrl, dishes }, 'Caption generation failed');

      if (error instanceof AIServiceError) {
        throw error;
      }

      throw new AIServiceError('AI caption generation failed');
    }
  }

  private async recognizeDishesWithRetry(
    imageUrl: string,
    attempt = 0,
  ): Promise<string[]> {
    const response = await this.callWithOptionalRetry(() =>
      this.createDishRecognition(imageUrl),
    );
    const content = response.choices[0]?.message?.content;

    if (!content) {
      throw new AIServiceError('Empty AI response');
    }

    try {
      const parsed: unknown = JSON.parse(content);
      const dishes = validateDishList(parsed);

      this.log.info({ usage: response.usage, imageUrl, dishes }, 'Dishes recognized');

      return dishes;
    } catch (error) {
      if (error instanceof AIServiceError && attempt === 0) {
        this.log.warn({ imageUrl }, 'Invalid AI dish shape, retrying once');
        return this.recognizeDishesWithRetry(imageUrl, attempt + 1);
      }

      throw error;
    }
  }

  private async generateCaptionsWithRetry(
    imageUrl: string,
    dishes: string[],
    attempt = 0,
  ): Promise<CaptionSet> {
    const response = await this.callWithOptionalRetry(() =>
      this.createCaptionGeneration(imageUrl, dishes),
    );
    const content = response.choices[0]?.message?.content;

    if (!content) {
      throw new AIServiceError('Empty AI response');
    }

    try {
      const parsed: unknown = JSON.parse(content);
      const captions = validateCaptionSet(parsed);

      this.log.info(
        {
          usage: response.usage,
          imageUrl,
          dishes,
        },
        'Captions generated',
      );

      return captions;
    } catch (error) {
      if (error instanceof AIServiceError && attempt === 0) {
        this.log.warn({ imageUrl, dishes }, 'Invalid AI caption shape, retrying once');
        return this.generateCaptionsWithRetry(imageUrl, dishes, attempt + 1);
      }

      throw error;
    }
  }

  private async callWithOptionalRetry<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (this.isRateLimitError(error)) {
        await this.sleep(1000);
        return await fn();
      }

      throw error;
    }
  }

  private createDishRecognition(imageUrl: string) {
    return this.client.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 300,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: DISH_RECOGNITION_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: '請辨識這張圖片中的主菜。' },
            { type: 'image_url', image_url: { url: imageUrl } },
          ],
        },
      ],
    });
  }

  private createCaptionGeneration(imageUrl: string, dishes: string[]) {
    const dishList = dishes.map((dish, index) => `菜色${index + 1}: ${dish}`).join('\n');

    return this.client.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 1000,
      temperature: 0.7,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: CAPTION_SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `以下為已確認的菜色，請依此生成三平台文案：\n${dishList}`,
            },
            { type: 'image_url', image_url: { url: imageUrl } },
          ],
        },
      ],
    });
  }

  private isRateLimitError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'status' in error &&
      (error as { status?: number }).status === 429
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
}
