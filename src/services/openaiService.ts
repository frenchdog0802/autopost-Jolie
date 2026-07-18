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

const CAPTION_SYSTEM_PROMPT = `你是一位愛煮家常菜、語氣口語又帶點搞笑的自煮帳號。受眾是喜歡家常菜、下班想隨便煮一煮的人。請根據使用者提供的已確認菜色，為 Instagram、Facebook、Threads 各生成一則貼文文案。

【人設語氣】
- 不要提到孩子
- 像跟朋友傳訊息：白話、短句、有點吐槽、有點自嘲
- 可以把菜色寫成小角色（誰在吵、誰裝乖、誰當氣氛組）
- 好笑要貼近日常，不要變成段子帳或連續哏
- 結尾輕鬆帶過即可，不講大道理、不雞湯收尾

【禁止事項】
- 禁止雞湯／AI 味空話：療癒、溫暖、幸福、用心、滿滿、家的味道、小小的、剛剛好、今天也、心意最珍貴、簡單卻最幸福
- 禁止髒話、過度厭世（例如：社畜、崩潰、ㄆㄨㄣ、眼神死）
- 禁止過度專業或教科書式口吻
- 禁止浮誇推銷或業配感
- 禁止反問句或邀請互動（例如：你們今晚吃什麼？、留言告訴我）

【平台文案規範】

◎Instagram
- 風格：口語、好笑、適合圖文
- 字數：80~200 字之間（包含標點）
- 結構（依序）：
  1. 開頭一句生活吐槽或搞笑觀察（不要勵志雞湯）
  2. 點出今日菜色有哪些（須涵蓋所有菜名）
  3. 用角色感或吐槽形容好吃／吃得很爽
- hashtags：3~5 個

◎Facebook
- 風格：閒話家常，再放鬆、好笑一點，像寫日記給朋友看
- 字數：150~300 字之間
- 結構：開場吐槽 → 點菜色並給每道一點個性／吃感 → 輕鬆收尾（可吐槽洗碗、碗空很快等）
- hashtags：3~5 個

◎Threads
- 風格：更短、更碎，像隨口講一句
- 字數：嚴禁超過 140 字（包含標點）
- 結構（依序）：
  1. 說明今日菜色有哪些（須涵蓋所有菜名）
  2. 一兩句吐槽或角色感，帶出好吃／滿足
- hashtags：2~4 個

【風格範例】（菜色：宮保雞丁、燙青菜、水煮蛋；請學語氣，不要照抄）
- Instagram：人生有三件事不能省：飯、菜、還有一顆能剝的蛋。／今日菜色：宮保雞丁、燙青菜、水煮蛋。／雞丁負責熱血，青菜負責假裝健康，水煮蛋負責說「我也很忙」。
- Threads：今晚：宮保雞丁、燙青菜、水煮蛋。／一個會嗆、一個很乖、一個剝完還想再來一顆。平衡飲食？大概就是這個意思。

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
const LOG_CONTENT_PREVIEW_LENGTH = 600;

function previewContent(content: string, maxLength = LOG_CONTENT_PREVIEW_LENGTH): string {
  if (content.length <= maxLength) {
    return content;
  }

  return `${content.slice(0, maxLength)}...`;
}

function summarizeUnknownError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    };
  }

  return { value: String(error) };
}

function summarizeApiError(error: unknown): Record<string, unknown> {
  if (typeof error !== 'object' || error === null) {
    return summarizeUnknownError(error);
  }

  const record = error as Record<string, unknown>;
  const nestedError =
    typeof record.error === 'object' && record.error !== null
      ? (record.error as Record<string, unknown>)
      : undefined;

  return {
    status: record.status,
    message: record.message,
    code: record.code,
    type: record.type,
    apiMessage: nestedError?.message,
    apiCode: nestedError?.code,
  };
}

function summarizeCaptionResponse(response: {
  choices: Array<{
    finish_reason?: string | null;
    message?: { content?: string | null; reasoning_content?: string | null };
  }>;
  usage?: unknown;
}): Record<string, unknown> {
  const choice = response.choices[0];
  const content = choice?.message?.content ?? '';
  const reasoningContent = choice?.message?.reasoning_content ?? '';

  return {
    finishReason: choice?.finish_reason,
    contentLength: content.length,
    reasoningContentLength: reasoningContent.length,
    usage: response.usage,
  };
}

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
      this.log.error(
        {
          err: summarizeUnknownError(error),
          apiError: summarizeApiError(error),
          imageUrl,
          dishes,
          model: DEEPSEEK_CAPTION_MODEL,
        },
        'Caption generation failed',
      );

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
    let response;

    try {
      response = await this.callWithOptionalRetry(() =>
        this.createCaptionGeneration(imageUrl, dishes),
      );
    } catch (error) {
      this.log.error(
        {
          attempt,
          dishes,
          imageUrl,
          model: DEEPSEEK_CAPTION_MODEL,
          apiError: summarizeApiError(error),
          err: summarizeUnknownError(error),
        },
        'DeepSeek caption API request failed',
      );
      throw error;
    }

    const content = response.choices[0]?.message?.content;
    const responseMeta = summarizeCaptionResponse(response);

    if (!content) {
      const failureContext = {
        attempt,
        dishes,
        imageUrl,
        model: DEEPSEEK_CAPTION_MODEL,
        ...responseMeta,
      };

      if (attempt === 0) {
        this.log.warn(failureContext, 'Empty AI caption response, retrying once');
        return this.generateCaptionsWithRetry(imageUrl, dishes, attempt + 1);
      }

      this.log.error(failureContext, 'Empty AI caption response after retry');
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
      const failureContext = {
        attempt,
        dishes,
        imageUrl,
        model: DEEPSEEK_CAPTION_MODEL,
        ...responseMeta,
        contentPreview: previewContent(content),
        err: summarizeUnknownError(error),
      };

      if (attempt === 0) {
        this.log.warn(failureContext, 'Invalid AI caption response, retrying once');
        return this.generateCaptionsWithRetry(imageUrl, dishes, attempt + 1);
      }

      this.log.error(failureContext, 'Invalid AI caption response after retry');

      if (error instanceof AIServiceError) {
        throw error;
      }

      if (error instanceof SyntaxError) {
        throw new AIServiceError(`Invalid JSON from caption model: ${error.message}`);
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
      max_tokens: 4000,
      temperature: 0.85,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: CAPTION_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `以下為已確認的菜色，請依此生成 Facebook、Instagram 與 Threads 文案：\n${dishList}`,
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
