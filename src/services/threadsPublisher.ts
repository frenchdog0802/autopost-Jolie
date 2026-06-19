import type { RuntimeConfig } from '../config/index.js';
import type { IPublisher, PublishResult } from '../types/index.js';
import { createChildLogger } from '../utils/logger.js';

const GRAPH_API_BASE = 'https://graph.threads.net/v1.0';

interface GraphErrorBody {
  error?: {
    message?: string;
    code?: number;
  };
}

function isTokenExpiredError(body: GraphErrorBody): boolean {
  return body.error?.code === 190;
}

function formatThreadsTokenError(body: GraphErrorBody): string {
  const message = body.error?.message ?? '';
  if (message.includes('Cannot parse access token')) {
    return 'threads access token 無效，請至 Meta Developer 重新產生 THREADS_ACCESS_TOKEN';
  }
  if (isTokenExpiredError(body)) {
    return 'threads token 可能已過期，請更新 access token';
  }
  return message;
}

/**
 * Threads publisher using Meta Graph API two-step publish flow.
 */
export class ThreadsPublisher implements IPublisher {
  private readonly userId: string;
  private readonly accessToken: string;
  private readonly log = createChildLogger({ platform: 'threads' });

  constructor(
    config: Pick<RuntimeConfig, 'THREADS_USER_ID' | 'THREADS_ACCESS_TOKEN'>,
  ) {
    this.userId = config.THREADS_USER_ID;
    this.accessToken = config.THREADS_ACCESS_TOKEN;
  }

  async publish(
    imageUrl: string,
    caption: string,
    hashtags: string,
  ): Promise<PublishResult> {
    const fullCaption = `${caption}\n${hashtags}`.trim();

    try {
      const creationId = await this.createContainer(imageUrl, fullCaption);
      const mediaId = await this.publishContainer(creationId);
      const postUrl = await this.fetchPermalink(mediaId);

      const result: PublishResult = {
        platform: 'threads',
        success: true,
        postUrl,
      };
      this.log.info(result, 'Threads publish succeeded');
      return result;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Threads publish failed';
      const result: PublishResult = {
        platform: 'threads',
        success: false,
        error: message,
      };
      this.log.error({ err: error, ...result }, 'Threads publish failed');
      return result;
    }
  }

  private async createContainer(
    imageUrl: string,
    text: string,
  ): Promise<string> {
    const url = new URL(`${GRAPH_API_BASE}/${this.userId}/threads`);
    url.searchParams.set('media_type', 'IMAGE');
    url.searchParams.set('image_url', imageUrl);
    url.searchParams.set('text', text);
    url.searchParams.set('access_token', this.accessToken);

    const response = await fetch(url, { method: 'POST' });
    const body = (await response.json()) as GraphErrorBody & { id?: string };

    if (!response.ok || !body.id) {
      const tokenError = formatThreadsTokenError(body);
      if (isTokenExpiredError(body)) {
        throw new Error(tokenError);
      }
      throw new Error(tokenError || 'Threads container creation failed');
    }

    return body.id;
  }

  private async publishContainer(creationId: string): Promise<string> {
    const url = new URL(`${GRAPH_API_BASE}/${this.userId}/threads_publish`);
    url.searchParams.set('creation_id', creationId);
    url.searchParams.set('access_token', this.accessToken);

    const response = await fetch(url, { method: 'POST' });
    const body = (await response.json()) as GraphErrorBody & { id?: string };

    if (!response.ok || !body.id) {
      const tokenError = formatThreadsTokenError(body);
      if (isTokenExpiredError(body)) {
        throw new Error(tokenError);
      }
      throw new Error(tokenError || 'Threads publish failed');
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
      throw new Error(body.error?.message ?? 'Threads permalink fetch failed');
    }

    return body.permalink;
  }
}
