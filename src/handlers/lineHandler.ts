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
import { buildDishConfirmMessage } from '../utils/buildDishConfirmMessage.js';
import { buildPreviewMessage } from '../utils/buildPreviewMessage.js';
import { parseEditedCaptions } from '../utils/parseEditedCaptions.js';
import { parseManualDishes } from '../utils/parseManualDishes.js';
import { formatPublishResults } from '../utils/formatPublishResults.js';
import { createChildLogger } from '../utils/logger.js';

export interface LineWebhookEvent {
  type: string;
  source?: { userId?: string; type?: string };
  message?: { type?: string; id?: string; text?: string };
  postback?: { data?: string };
  replyToken?: string;
}

export interface LineHandlerDeps {
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
    if (!userId) {
      return;
    }

    if (event.type === 'message' && event.message?.type === 'image') {
      await this.handleImageMessage(userId, event.message.id);
      return;
    }

    if (event.type === 'message' && event.message?.type === 'text') {
      await this.handleTextMessage(userId, event.message.text);
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

      const dishes = await this.deps.aiService.recognizeDishes(upload.url);
      const session: PostSession = {
        userId,
        imageS3Key: upload.key,
        imageUrl: upload.url,
        dishes,
        createdAt: new Date(),
        status: 'pending_dish_confirm',
      };

      this.deps.sessionStore.set(userId, session);
      await this.pushMessages(userId, [buildDishConfirmMessage(dishes)]);
    } catch (error) {
      if (error instanceof S3UploadError) {
        await this.pushText(userId, LINE_MESSAGES.s3UploadFailed);
        return;
      }

      if (error instanceof AIServiceError) {
        if (uploadedKey) {
          await this.safeDeleteS3(uploadedKey);
        }
        await this.pushText(userId, LINE_MESSAGES.dishRecognitionFailed);
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
      case POSTBACK_ACTIONS.dishConfirm:
        await this.handleDishConfirm(userId);
        break;
      case POSTBACK_ACTIONS.dishReject:
        await this.handleDishReject(userId);
        break;
      case POSTBACK_ACTIONS.confirm:
        await this.handleConfirm(userId);
        break;
      case POSTBACK_ACTIONS.edit:
        await this.handleEditStart(userId);
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

  private async handleTextMessage(
    userId: string,
    text?: string,
  ): Promise<void> {
    const session = this.deps.sessionStore.get(userId);
    if (!session) {
      return;
    }

    if (!text?.trim()) {
      return;
    }

    if (session.status === 'pending_dish_input') {
      await this.handleManualDishInput(userId, session, text);
      return;
    }

    if (session.status === 'pending_edit') {
      await this.handleCaptionEdit(userId, session, text);
    }
  }

  private async handleDishConfirm(userId: string): Promise<void> {
    const session = this.deps.sessionStore.get(userId);
    if (!session || session.status !== 'pending_dish_confirm') {
      await this.pushText(userId, LINE_MESSAGES.sessionExpired);
      return;
    }

    await this.generateAndPreviewCaptions(userId, session);
  }

  private async handleDishReject(userId: string): Promise<void> {
    const session = this.deps.sessionStore.get(userId);
    if (!session || session.status !== 'pending_dish_confirm') {
      await this.pushText(userId, LINE_MESSAGES.sessionExpired);
      return;
    }

    this.deps.sessionStore.set(userId, {
      ...session,
      status: 'pending_dish_input',
    });
    await this.pushText(userId, LINE_MESSAGES.dishInputPrompt);
  }

  private async handleManualDishInput(
    userId: string,
    session: PostSession,
    text: string,
  ): Promise<void> {
    const dishes = parseManualDishes(text);
    if (!dishes) {
      await this.pushText(userId, LINE_MESSAGES.dishInputInvalid);
      return;
    }

    const updated: PostSession = {
      ...session,
      dishes,
      status: 'pending_dish_input',
    };

    await this.generateAndPreviewCaptions(userId, updated);
  }

  private async handleCaptionEdit(
    userId: string,
    session: PostSession,
    text: string,
  ): Promise<void> {
    const updatedCaptions = parseEditedCaptions(text);

    const updated: PostSession = {
      ...session,
      captions: updatedCaptions,
      status: 'pending_confirm',
    };

    this.deps.sessionStore.set(userId, updated);
    await this.pushMessages(userId, [buildPreviewMessage(updatedCaptions)]);
  }

  private async generateAndPreviewCaptions(
    userId: string,
    session: PostSession,
  ): Promise<void> {
    await this.pushText(userId, LINE_MESSAGES.captionGenerating);

    try {
      const captions = await this.deps.aiService.generateCaptions(
        session.imageUrl,
        session.dishes,
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
        this.log.error(
          {
            userId,
            dishes: session.dishes,
            imageUrl: session.imageUrl,
            reason: error.message,
          },
          'Caption generation failed for user',
        );
        await this.pushText(userId, LINE_MESSAGES.aiFailed);
        return;
      }

      this.log.error({ err: error, userId }, 'Caption generation failed');
    }
  }

  private async handleEditStart(userId: string): Promise<void> {
    const session = this.deps.sessionStore.get(userId);
    if (!session || session.status !== 'pending_confirm' || !session.captions) {
      await this.pushText(userId, LINE_MESSAGES.sessionExpired);
      return;
    }

    this.deps.sessionStore.set(userId, {
      ...session,
      status: 'pending_edit',
    });

    await this.pushText(userId, LINE_MESSAGES.editPrompt);
  }

  private async handleConfirm(userId: string): Promise<void> {
    const session = this.deps.sessionStore.get(userId);
    if (!session?.captions) {
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
    if (!session || session.status !== 'pending_confirm') {
      await this.pushText(userId, LINE_MESSAGES.sessionExpired);
      return;
    }

    await this.generateAndPreviewCaptions(userId, session);
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
