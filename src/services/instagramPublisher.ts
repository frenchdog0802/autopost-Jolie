import type { RuntimeConfig } from '../config/index.js';
import type { IPublisher, PublishResult } from '../types/index.js';
import { createChildLogger } from '../utils/logger.js';

const GRAPH_API_BASE = 'https://graph.facebook.com/v21.0';
const MEDIA_POLL_INTERVAL_MS = 3_000;
const MEDIA_POLL_TIMEOUT_MS = 60_000;

interface GraphErrorBody {
  error?: {
    message?: string;
    code?: number;
  };
}

type MediaStatusCode =
  | 'EXPIRED'
  | 'ERROR'
  | 'FINISHED'
  | 'IN_PROGRESS'
  | 'PUBLISHED';

function isTokenExpiredError(body: GraphErrorBody): boolean {
  return body.error?.code === 190;
}

function formatTokenError(platform: PublishResult['platform']): string {
  return `${platform} token 可能已過期，請更新 access token`;
}

/**
 * Instagram publisher using Meta Graph API two-step media publish flow.
 */
export class InstagramPublisher implements IPublisher {
  private readonly accountId: string;
  private readonly accessToken: string;
  private readonly log = createChildLogger({ platform: 'instagram' });

  constructor(
    config: Pick<
      RuntimeConfig,
      'INSTAGRAM_BUSINESS_ACCOUNT_ID' | 'META_USER_ACCESS_TOKEN'
    >,
  ) {
    this.accountId = config.INSTAGRAM_BUSINESS_ACCOUNT_ID;
    this.accessToken = config.META_USER_ACCESS_TOKEN;
  }

  async publish(
    imageUrl: string,
    caption: string,
    hashtags: string,
  ): Promise<PublishResult> {
    const fullCaption = `${caption}\n${hashtags}`.trim();

    try {
      const creationId = await this.createMedia(imageUrl, fullCaption);
      await this.waitForMediaReady(creationId);
      const mediaId = await this.publishMedia(creationId);
      const postUrl = await this.fetchPermalink(mediaId);

      const result: PublishResult = {
        platform: 'instagram',
        success: true,
        postUrl,
      };
      this.log.info(result, 'Instagram publish succeeded');
      return result;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Instagram publish failed';
      const result: PublishResult = {
        platform: 'instagram',
        success: false,
        error: message,
      };
      this.log.error({ err: error, ...result }, 'Instagram publish failed');
      return result;
    }
  }

  private async createMedia(imageUrl: string, caption: string): Promise<string> {
    const url = new URL(`${GRAPH_API_BASE}/${this.accountId}/media`);
    url.searchParams.set('image_url', imageUrl);
    url.searchParams.set('caption', caption);
    url.searchParams.set('access_token', this.accessToken);

    const response = await fetch(url, { method: 'POST' });
    const body = (await response.json()) as GraphErrorBody & {
      id?: string;
    };

    if (!response.ok || !body.id) {
      if (isTokenExpiredError(body)) {
        throw new Error(formatTokenError('instagram'));
      }
      throw new Error(body.error?.message ?? 'Instagram media creation failed');
    }

    return body.id;
  }

  private async waitForMediaReady(creationId: string): Promise<void> {
    const deadline = Date.now() + MEDIA_POLL_TIMEOUT_MS;

    while (Date.now() < deadline) {
      const url = new URL(`${GRAPH_API_BASE}/${creationId}`);
      url.searchParams.set('fields', 'status_code');
      url.searchParams.set('access_token', this.accessToken);

      const response = await fetch(url);
      const body = (await response.json()) as GraphErrorBody & {
        status_code?: MediaStatusCode;
      };

      if (!response.ok) {
        if (isTokenExpiredError(body)) {
          throw new Error(formatTokenError('instagram'));
        }
        throw new Error(
          body.error?.message ?? 'Instagram media status check failed',
        );
      }

      if (body.status_code === 'FINISHED') {
        return;
      }

      if (body.status_code === 'ERROR' || body.status_code === 'EXPIRED') {
        throw new Error(
          `Instagram media processing failed (${body.status_code})`,
        );
      }

      await new Promise((resolve) => setTimeout(resolve, MEDIA_POLL_INTERVAL_MS));
    }

    throw new Error('Instagram media processing timed out');
  }

  private async publishMedia(creationId: string): Promise<string> {
    const url = new URL(`${GRAPH_API_BASE}/${this.accountId}/media_publish`);
    url.searchParams.set('creation_id', creationId);
    url.searchParams.set('access_token', this.accessToken);

    const response = await fetch(url, { method: 'POST' });
    const body = (await response.json()) as GraphErrorBody & { id?: string };

    if (!response.ok || !body.id) {
      if (isTokenExpiredError(body)) {
        throw new Error(formatTokenError('instagram'));
      }
      throw new Error(body.error?.message ?? 'Instagram media publish failed');
    }

    return body.id;
  }

  private async fetchPermalink(mediaId: string): Promise<string> {
    const url = new URL(`${GRAPH_API_BASE}/${mediaId}`);
    url.searchParams.set('fields', 'permalink');
    url.searchParams.set('access_token', this.accessToken);

    const response = await fetch(url);
    const body = (await response.json()) as GraphErrorBody & {
      permalink?: string;
    };

    if (!response.ok || !body.permalink) {
      throw new Error(body.error?.message ?? 'Instagram permalink fetch failed');
    }

    return body.permalink;
  }
}
