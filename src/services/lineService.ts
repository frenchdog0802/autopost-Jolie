import {
  messagingApi,
  type messagingApi as MessagingApi,
} from '@line/bot-sdk';
import type { RuntimeConfig } from '../config/index.js';
import type { ILineService, LineMessage } from '../types/index.js';
import { createChildLogger } from '../utils/logger.js';

export interface LineServiceDeps {
  config: Pick<RuntimeConfig, 'LINE_CHANNEL_ACCESS_TOKEN'>;
  client?: MessagingApi.MessagingApiClient;
  blobClient?: MessagingApi.MessagingApiBlobClient;
}

/**
 * LINE Messaging API wrapper for reply, push, and content download.
 */
export class LineService implements ILineService {
  private readonly client: MessagingApi.MessagingApiClient;
  private readonly blobClient: MessagingApi.MessagingApiBlobClient;
  private readonly log = createChildLogger({ service: 'line' });

  constructor(deps: LineServiceDeps) {
    this.client =
      deps.client ??
      new messagingApi.MessagingApiClient({
        channelAccessToken: deps.config.LINE_CHANNEL_ACCESS_TOKEN,
      });
    this.blobClient =
      deps.blobClient ??
      new messagingApi.MessagingApiBlobClient({
        channelAccessToken: deps.config.LINE_CHANNEL_ACCESS_TOKEN,
      });
  }

  async replyMessage(
    replyToken: string,
    messages: LineMessage[],
  ): Promise<void> {
    try {
      await this.client.replyMessage({
        replyToken,
        messages: messages as messagingApi.Message[],
      });
    } catch (error) {
      this.log.error({ err: error }, 'LINE replyMessage failed');
      throw error;
    }
  }

  async pushMessage(userId: string, messages: LineMessage[]): Promise<void> {
    try {
      await this.client.pushMessage({
        to: userId,
        messages: messages as messagingApi.Message[],
      });
    } catch (error) {
      this.log.error({ err: error, userId }, 'LINE pushMessage failed');
      throw error;
    }
  }

  async getMessageContent(messageId: string): Promise<Buffer> {
    try {
      const stream = await this.blobClient.getMessageContent(messageId);
      const chunks: Buffer[] = [];

      for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk));
      }

      return Buffer.concat(chunks);
    } catch (error) {
      this.log.error({ err: error, messageId }, 'LINE getMessageContent failed');
      throw error;
    }
  }
}
