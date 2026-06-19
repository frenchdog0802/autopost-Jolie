import type { RuntimeConfig } from '../config/index.js';
import type { IPublisher, PublishResult } from '../types/index.js';
import { createChildLogger } from '../utils/logger.js';

const GRAPH_API_BASE = 'https://graph.facebook.com/v21.0';

interface GraphErrorBody {
  error?: {
    message?: string;
    code?: number;
  };
}

function isTokenExpiredError(body: GraphErrorBody): boolean {
  return body.error?.code === 190;
}

/**
 * Facebook Page photo publisher using Meta Graph API.
 */
export class FacebookPublisher implements IPublisher {
  private readonly pageId: string;
  private readonly userAccessToken: string;
  private readonly log = createChildLogger({ platform: 'facebook' });

  constructor(
    config: Pick<RuntimeConfig, 'FACEBOOK_PAGE_ID' | 'META_USER_ACCESS_TOKEN'>,
  ) {
    this.pageId = config.FACEBOOK_PAGE_ID;
    this.userAccessToken = config.META_USER_ACCESS_TOKEN;
  }

  private async getPageAccessToken(): Promise<string> {
    const url = new URL(`${GRAPH_API_BASE}/${this.pageId}`);
    url.searchParams.set('fields', 'access_token');
    url.searchParams.set('access_token', this.userAccessToken);

    const response = await fetch(url);
    const body = (await response.json()) as GraphErrorBody & {
      access_token?: string;
    };

    if (!response.ok || !body.access_token) {
      if (isTokenExpiredError(body)) {
        throw new Error('facebook token 可能已過期，請更新 access token');
      }
      throw new Error(body.error?.message ?? 'Facebook page token fetch failed');
    }

    return body.access_token;
  }

  async publish(
    imageUrl: string,
    caption: string,
    hashtags: string,
  ): Promise<PublishResult> {
    const fullCaption = `${caption}\n${hashtags}`.trim();

    try {
      const pageAccessToken = await this.getPageAccessToken();

      const url = new URL(`${GRAPH_API_BASE}/${this.pageId}/photos`);
      url.searchParams.set('url', imageUrl);
      url.searchParams.set('caption', fullCaption);
      url.searchParams.set('published', 'true');
      url.searchParams.set('access_token', pageAccessToken);

      const response = await fetch(url, { method: 'POST' });
      const body = (await response.json()) as GraphErrorBody & {
        post_id?: string;
        id?: string;
      };

      if (!response.ok) {
        if (isTokenExpiredError(body)) {
          throw new Error('facebook token 可能已過期，請更新 access token');
        }
        throw new Error(body.error?.message ?? 'Facebook publish failed');
      }

      const postId = body.post_id ?? body.id;
      const postUrl = postId
        ? `https://www.facebook.com/${postId}`
        : undefined;

      const result: PublishResult = {
        platform: 'facebook',
        success: true,
        postUrl,
      };
      this.log.info(result, 'Facebook publish succeeded');
      return result;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Facebook publish failed';
      const result: PublishResult = {
        platform: 'facebook',
        success: false,
        error: message,
      };
      this.log.error({ err: error, ...result }, 'Facebook publish failed');
      return result;
    }
  }
}
