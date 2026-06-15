import OpenAI from 'openai';
import type { RuntimeConfig } from '../config/index.js';
import type { CaptionSet, IAIService } from '../types/index.js';
import { AIServiceError } from '../types/errors.js';
import { createChildLogger } from '../utils/logger.js';
import { validateCaptionSet } from '../utils/validateCaptionSet.js';

const SYSTEM_PROMPT = `你是一位社群媒體文案專家。根據使用者提供的圖片，為以下三個平台各自生成一則貼文文案。
規則：
- 語言：繁體中文為主，可自然融入英文 hashtag
- 回傳格式：嚴格 JSON，不含任何 markdown 或額外說明
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
 * OpenAI Vision service for multi-platform caption generation.
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

  async generateCaptions(imageUrl: string): Promise<CaptionSet> {
    try {
      const response = await this.callWithOptionalRetry(imageUrl);
      const content = response.choices[0]?.message?.content;

      if (!content) {
        throw new AIServiceError('Empty AI response');
      }

      const parsed: unknown = JSON.parse(content);
      const captions = validateCaptionSet(parsed);

      this.log.info(
        {
          usage: response.usage,
          imageUrl,
        },
        'Captions generated',
      );

      return captions;
    } catch (error) {
      this.log.error({ err: error, imageUrl }, 'Caption generation failed');

      if (error instanceof AIServiceError) {
        throw error;
      }

      throw new AIServiceError('AI caption generation failed');
    }
  }

  private async callWithOptionalRetry(imageUrl: string) {
    try {
      return await this.createCompletion(imageUrl);
    } catch (error) {
      if (this.isRateLimitError(error)) {
        await this.sleep(1000);
        return await this.createCompletion(imageUrl);
      }

      throw error;
    }
  }

  private async createCompletion(imageUrl: string) {
    return this.client.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 1000,
      temperature: 0.7,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: '請根據這張圖片生成三平台文案。' },
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
