import { describe, expect, expectTypeOf, it } from 'vitest';
import type {
  CaptionSet,
  IAIService,
  ILineService,
  IPublisher,
  IPublisherRegistry,
  IS3Service,
  ISessionStore,
  LineMessage,
  PlatformCaption,
  PostSession,
  PublishResult,
  SessionStatus,
} from '../index.js';
import {
  AIServiceError,
  ConfigError,
  S3UploadError,
  SessionNotFoundError,
  SignatureError,
} from '../index.js';

describe('types', () => {
  it('defines PlatformCaption with caption and hashtags strings', () => {
    expectTypeOf<PlatformCaption>().toEqualTypeOf<{
      caption: string;
      hashtags: string;
    }>();
  });

  it('defines CaptionSet with all three platforms', () => {
    expectTypeOf<CaptionSet>().toEqualTypeOf<{
      instagram: PlatformCaption;
      facebook: PlatformCaption;
      threads: PlatformCaption;
    }>();
  });

  it('defines SessionStatus union', () => {
    expectTypeOf<SessionStatus>().toEqualTypeOf<
      | 'pending_confirm'
      | 'pending_edit'
      | 'publishing'
      | 'done'
      | 'cancelled'
    >();
  });

  it('defines PostSession shape', () => {
    expectTypeOf<PostSession>().toEqualTypeOf<{
      userId: string;
      imageS3Key: string;
      imageUrl: string;
      captions: CaptionSet;
      createdAt: Date;
      status: SessionStatus;
    }>();
  });

  it('defines PublishResult shape', () => {
    expectTypeOf<PublishResult>().toEqualTypeOf<{
      platform: 'instagram' | 'facebook' | 'threads';
      success: boolean;
      postUrl?: string;
      error?: string;
    }>();
  });

  it('defines IS3Service methods', () => {
    expectTypeOf<IS3Service>().toEqualTypeOf<{
      upload: (
        buffer: Buffer,
        mimeType: string,
      ) => Promise<{ key: string; url: string }>;
      delete: (key: string) => Promise<void>;
    }>();
  });

  it('defines IAIService methods', () => {
    expectTypeOf<IAIService>().toEqualTypeOf<{
      generateCaptions: (imageUrl: string) => Promise<CaptionSet>;
    }>();
  });

  it('defines IPublisher methods', () => {
    expectTypeOf<IPublisher>().toEqualTypeOf<{
      publish: (
        imageUrl: string,
        caption: string,
        hashtags: string,
      ) => Promise<PublishResult>;
    }>();
  });

  it('defines IPublisherRegistry methods', () => {
    expectTypeOf<IPublisherRegistry>().toEqualTypeOf<{
      publishAll: (
        imageUrl: string,
        captions: CaptionSet,
      ) => Promise<PublishResult[]>;
    }>();
  });

  it('defines ISessionStore methods', () => {
    expectTypeOf<ISessionStore>().toEqualTypeOf<{
      get: (userId: string) => PostSession | undefined;
      set: (userId: string, session: PostSession) => void;
      delete: (userId: string) => void;
    }>();
  });

  it('defines ILineService methods', () => {
    expectTypeOf<ILineService>().toEqualTypeOf<{
      replyMessage: (
        replyToken: string,
        messages: LineMessage[],
      ) => Promise<void>;
      pushMessage: (userId: string, messages: LineMessage[]) => Promise<void>;
      getMessageContent: (messageId: string) => Promise<Buffer>;
    }>();
  });

  it('exports custom error classes', () => {
    expect(new SignatureError()).toBeInstanceOf(Error);
    expect(new S3UploadError()).toBeInstanceOf(Error);
    expect(new AIServiceError()).toBeInstanceOf(Error);
    expect(new SessionNotFoundError()).toBeInstanceOf(Error);
    expect(new ConfigError()).toBeInstanceOf(Error);
  });
});
