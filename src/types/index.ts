/**
 * Platform-specific caption and hashtags for a single social network.
 */
export interface PlatformCaption {
  /** Post body text without hashtags. */
  caption: string;
  /** Space-separated hashtag string. */
  hashtags: string;
}

/**
 * AI-generated captions for Instagram, Facebook, and Threads.
 */
export interface CaptionSet {
  instagram: PlatformCaption;
  facebook: PlatformCaption;
  threads: PlatformCaption;
}

/**
 * Session lifecycle states for the post confirmation flow.
 */
export type SessionStatus =
  | 'pending_dish_confirm'
  | 'pending_dish_input'
  | 'pending_confirm'
  | 'pending_edit'
  | 'publishing'
  | 'done'
  | 'cancelled';

/**
 * In-memory post session tied to a LINE user.
 */
export interface PostSession {
  /** LINE user ID that owns this session. */
  userId: string;
  /** S3 object key for the uploaded image. */
  imageS3Key: string;
  /** Public URL of the uploaded image. */
  imageUrl: string;
  /** Confirmed dish names (1–5 items). */
  dishes: string[];
  /** AI-generated captions awaiting user confirmation. */
  captions?: CaptionSet;
  /** Session creation timestamp. */
  createdAt: Date;
  /** Current state in the confirmation and publish flow. */
  status: SessionStatus;
}

/** Supported social publishing platforms. */
export type Platform = 'instagram' | 'facebook' | 'threads';

/**
 * Result of a single-platform publish attempt.
 * Publishers must always resolve with this shape instead of throwing.
 */
export interface PublishResult {
  /** Platform that was targeted. */
  platform: Platform;
  /** Whether the publish succeeded. */
  success: boolean;
  /** Public post URL when publish succeeds. */
  postUrl?: string;
  /** Error message when publish fails. */
  error?: string;
}

/**
 * Contract for uploading and deleting images in S3.
 */
export interface IS3Service {
  /**
   * Upload image bytes and return the stored object key and public URL.
   */
  upload(buffer: Buffer, mimeType: string): Promise<{ key: string; url: string }>;

  /**
   * Delete an object by S3 key.
   */
  delete(key: string): Promise<void>;
}

/**
 * Contract for dish recognition and multi-platform caption generation.
 */
export interface IAIService {
  /**
   * Recognize 1–5 main dishes from an image URL.
   */
  recognizeDishes(imageUrl: string): Promise<string[]>;

  /**
   * Generate captions for Instagram, Facebook, and Threads from confirmed dishes.
   */
  generateCaptions(imageUrl: string, dishes: string[]): Promise<CaptionSet>;
}

/**
 * Contract for publishing to a single social platform.
 * Implementations must catch errors and return PublishResult.
 */
export interface IPublisher {
  /**
   * Publish an image with caption and hashtags to one platform.
   */
  publish(
    imageUrl: string,
    caption: string,
    hashtags: string,
  ): Promise<PublishResult>;
}

/**
 * Contract for publishing to all configured platforms in parallel.
 */
export interface IPublisherRegistry {
  /**
   * Publish to every platform and return isolated per-platform results.
   */
  publishAll(imageUrl: string, captions: CaptionSet): Promise<PublishResult[]>;
}

/**
 * Contract for storing per-user post sessions in memory.
 */
export interface ISessionStore {
  /**
   * Retrieve the active session for a user, if any.
   */
  get(userId: string): PostSession | undefined;

  /**
   * Persist or replace a user's session.
   */
  set(userId: string, session: PostSession): void;

  /**
   * Remove a user's session.
   */
  delete(userId: string): void;
}

/** Minimal LINE text message payload. */
export interface LineTextMessage {
  type: 'text';
  text: string;
  quickReply?: {
    items: Array<{
      type: 'action';
      action: {
        type: 'postback';
        label: string;
        data: string;
      };
    }>;
  };
}

/** LINE message types supported by reply and push helpers. */
export type LineMessage = LineTextMessage;

/**
 * Contract for LINE Messaging API interactions.
 */
export interface ILineService {
  /**
   * Reply to a webhook event using a one-time reply token.
   */
  replyMessage(replyToken: string, messages: LineMessage[]): Promise<void>;

  /**
   * Push a message to a specific user.
   */
  pushMessage(userId: string, messages: LineMessage[]): Promise<void>;

  /**
   * Download binary content for a LINE message ID.
   */
  getMessageContent(messageId: string): Promise<Buffer>;
}

export {
  AIServiceError,
  ConfigError,
  S3UploadError,
  SessionNotFoundError,
  SignatureError,
} from './errors.js';

export { LINE_MESSAGES, PLATFORMS, POSTBACK_ACTIONS } from './constants.js';
