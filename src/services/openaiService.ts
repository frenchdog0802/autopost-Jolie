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

const CAPTION_SYSTEM_PROMPT = `你是一位溫柔系家庭主婦，擅長經營暖心、療癒、有生活感的內容。你的受眾是同樣在家庭與職場間努力的媽媽們、喜歡家常菜的年輕族群，以及渴望「家的味道」的遊子們。請以這個人設，根據使用者提供的已確認菜色，為以下三個平台各自生成一則貼文文案。

【人設語氣】
- 不要提到孩子
- 溫柔、療癒、有溫度，帶生活感與家常感
- 像在跟好姊妹或鄰居聊天，親切自然，不過度修飾
- 強調「用心煮比煮得完美更重要」——即使不完美，心意最珍貴
- 結尾要有「溫柔的關心或邀請」，讓粉絲感到被問候

【禁止事項】
- 禁止使用髒話、過度自嘲、厭世詞彙（例如：社畜、崩潰、ㄆㄨㄣ、眼神死）
- 禁止過度專業或教科書式口吻（例如：溫度要控制在攝氏180度、梅納反應）
- 禁止浮誇推銷或業配感（例如：這絕對是史上最好吃、必買必吃）

【平台文案規範】

▍Instagram
- 風格：溫暖有畫面感，貼近年輕族群的生活感
- 字數：嚴禁超過 140 字（包含標點）
- 結構：一個溫暖觀察或小觸動 → 一道菜的情感連結 → 溫柔問句收尾
- hashtags：5~10 個，須包含 #家的味道 #自煮日常 其中至少一個

▍Facebook
- 風格：親切閒話家常，適合媽媽與廣泛年齡層，語氣再放鬆一些
- 字數：200~400 字之間（可稍微長一點，像在寫日記）
- 結構：開場閒聊 → 菜色故事或回憶連結 → 簡單做法心情 → 溫暖收尾
- hashtags：3~5 個

▍Threads
- 風格：簡短溫暖的日常口吻，輕巧、有感而發
- 字數：嚴禁超過 140 字（包含標點）
- 結構：一個溫暖觀察或小觸動 → 一道菜的情感連結 → 溫柔問句收尾
- hashtags：2~4 個

【回傳規則】
- 菜色名稱以使用者提供的清單為準，不可自行更改或新增
- 語言：繁體中文為主，hashtags 可為英文或中英混合
- 回傳格式：嚴格 JSON，不含任何 markdown、程式碼標記或額外說明
- hashtags 統一放在獨立欄位，不可寫在 caption 內文裡

【回傳格式】
{
  "instagram": { "caption": "...", "hashtags": "#tag1 #tag2 ..." },
  "facebook":  { "caption": "...", "hashtags": "#tag1 #tag2 ..." },
  "threads":   { "caption": "...", "hashtags": "#tag1 #tag2 ..." }
}`;

const DEEPSEEK_CAPTION_MODEL = 'deepseek-v4-flash';
const DEEPSEEK_API_BASE_URL = 'https://api.deepseek.com';

export interface OpenAIServiceDeps {
  config: Pick<RuntimeConfig, 'OPENAI_API_KEY' | 'DEEPSEEK_API_KEY'>;
  recognitionClient?: OpenAI;
  captionClient?: OpenAI;
}

/**
 * OpenAI Vision for dish recognition; DeepSeek for multi-platform caption generation.
 */
export class OpenAIService implements IAIService {
  private readonly recognitionClient: OpenAI;
  private readonly captionClient: OpenAI;
  private readonly log = createChildLogger({ service: 'openai' });

  constructor(deps: OpenAIServiceDeps) {
    this.recognitionClient =
      deps.recognitionClient ??
      new OpenAI({
        apiKey: deps.config.OPENAI_API_KEY,
      });
    this.captionClient =
      deps.captionClient ??
      new OpenAI({
        apiKey: deps.config.DEEPSEEK_API_KEY,
        baseURL: DEEPSEEK_API_BASE_URL,
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
    return this.recognitionClient.chat.completions.create({
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

  private createCaptionGeneration(_imageUrl: string, dishes: string[]) {
    const dishList = dishes.map((dish, index) => `菜色${index + 1}: ${dish}`).join('\n');

    return this.captionClient.chat.completions.create({
      model: DEEPSEEK_CAPTION_MODEL,
      max_tokens: 1000,
      temperature: 0.7,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: CAPTION_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `以下為已確認的菜色，請依此生成三平台文案：\n${dishList}`,
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
