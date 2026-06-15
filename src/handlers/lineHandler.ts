import type {
  IAIService,
  ILineService,
  IPublisherRegistry,
  IS3Service,
  ISessionStore,
  LineMessage,
  PostSession,
} from '../types/index.js';
import { LINE_MESSAGES, POSTBACK_ACTIONS } from '../types/constants.js';
import { S3UploadError } from '../types/errors.js';
import { AIServiceError } from '../types/errors.js';
import { isAllowedUser } from '../utils/auth.js';
import { buildPreviewMessage } from '../utils/buildPreviewMessage.js';
import { formatPublishResults } from '../utils/formatPublishResults.js';
import { createChildLogger } from '../utils/logger.js';

export interface LineWebhookEvent {
  type: string;
  source?: { userId?: string; type?: string };
  message?: { type?: string; id?: string };
  postback?: { data?: string };
  replyToken?: string;
}

export interface LineHandlerDeps {
  allowedUserId: string;
  lineService: ILineService;
  s3Service: IS3Service;
  aiService: IAIService;
  sessionStore: ISessionStore;
  publisherRegistry: IPublisherRegistry;
}

/**
 * Orchestrates LINE webhook events through upload, AI, confirm, and publish flows.
 */
export class LineHandler {
  private readonly log = createChildLogger({ module: 'lineHandler' });

  constructor(private readonly deps: LineHandlerDeps) {}

  async handleEvents(events: LineWebhookEvent[]): Promise<void> {
    for (const event of events) {
      await this.handleEvent(event);
    }
  }

  async handleEvent(event: LineWebhookEvent): Promise<void> {
    const userId = event.source?.userId;
    if (!userId || !isAllowedUser(userId, this.deps.allowedUserId)) {
      return;
    }

    if (event.type === 'message' && event.message?.type === 'image') {
      await this.handleImageMessage(userId, event.message.id);
      return;
    }

    if (event.type === 'postback') {
      await this.handlePostback(userId, event.postback?.data);
    }
  }

  private async handleImageMessage(
    userId: string,
    messageId?: string,
  ): Promise<void> {
    const existing = this.deps.sessionStore.get(userId);
    if (existing?.status === 'publishing') {
      await this.pushText(userId, LINE_MESSAGES.publishingInProgress);
      return;
    }

    if (!messageId) {
      return;
    }

    await this.pushText(userId, LINE_MESSAGES.imageProcessing);

    let uploadedKey: string | undefined;

    try {
      const buffer = await this.deps.lineService.getMessageContent(messageId);
      const upload = await this.deps.s3Service.upload(buffer, 'image/jpeg');
      uploadedKey = upload.key;

      const captions = await this.deps.aiService.generateCaptions(upload.url);
      const session: PostSession = {
        userId,
        imageS3Key: upload.key,
        imageUrl: upload.url,
        captions,
        createdAt: new Date(),
        status: 'pending_confirm',
      };

      this.deps.sessionStore.set(userId, session);
      await this.pushMessages(userId, [buildPreviewMessage(captions)]);
    } catch (error) {
      if (error instanceof S3UploadError) {
        await this.pushText(userId, LINE_MESSAGES.s3UploadFailed);
        return;
      }

      if (error instanceof AIServiceError) {
        if (uploadedKey) {
          await this.safeDeleteS3(uploadedKey);
        }
        await this.pushText(userId, LINE_MESSAGES.aiFailed);
        return;
      }

      this.log.error({ err: error, userId }, 'Image handling failed');
    }
  }

  private async handlePostback(
    userId: string,
    data?: string,
  ): Promise<void> {
    switch (data) {
      case POSTBACK_ACTIONS.confirm:
        await this.handleConfirm(userId);
        break;
      case POSTBACK_ACTIONS.regenerate:
        await this.handleRegenerate(userId);
        break;
      case POSTBACK_ACTIONS.cancel:
        await this.handleCancel(userId);
        break;
      default:
        break;
    }
  }

  private async handleConfirm(userId: string): Promise<void> {
    const session = this.deps.sessionStore.get(userId);
    if (!session) {
      await this.pushText(userId, LINE_MESSAGES.sessionExpired);
      return;
    }

    await this.pushText(userId, LINE_MESSAGES.publishing);

    this.deps.sessionStore.set(userId, {
      ...session,
      status: 'publishing',
    });

    const results = await this.deps.publisherRegistry.publishAll(
      session.imageUrl,
      session.captions,
    );

    await this.pushText(userId, formatPublishResults(results));
    await this.safeDeleteS3(session.imageS3Key);
    this.deps.sessionStore.delete(userId);
  }

  private async handleRegenerate(userId: string): Promise<void> {
    const session = this.deps.sessionStore.get(userId);
    if (!session) {
      await this.pushText(userId, LINE_MESSAGES.sessionExpired);
      return;
    }

    try {
      const captions = await this.deps.aiService.generateCaptions(
        session.imageUrl,
      );
      const updated: PostSession = {
        ...session,
        captions,
        status: 'pending_confirm',
      };
      this.deps.sessionStore.set(userId, updated);
      await this.pushMessages(userId, [buildPreviewMessage(captions)]);
    } catch (error) {
      if (error instanceof AIServiceError) {
        await this.pushText(userId, LINE_MESSAGES.aiFailed);
        return;
      }

      this.log.error({ err: error, userId }, 'Regenerate failed');
    }
  }

  private async handleCancel(userId: string): Promise<void> {
    const session = this.deps.sessionStore.get(userId);
    if (!session) {
      await this.pushText(userId, LINE_MESSAGES.sessionExpired);
      return;
    }

    await this.safeDeleteS3(session.imageS3Key);
    this.deps.sessionStore.delete(userId);
    await this.pushText(userId, LINE_MESSAGES.cancelled);
  }

  private async pushText(userId: string, text: string): Promise<void> {
    await this.pushMessages(userId, [{ type: 'text', text }]);
  }

  private async pushMessages(
    userId: string,
    messages: LineMessage[],
  ): Promise<void> {
    await this.deps.lineService.pushMessage(userId, messages);
  }

  private async safeDeleteS3(key: string): Promise<void> {
    try {
      await this.deps.s3Service.delete(key);
    } catch (error) {
      this.log.error({ err: error, key }, 'Failed to delete S3 object');
    }
  }
}
