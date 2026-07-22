import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LineHandler } from '../lineHandler.js';
import { LINE_MESSAGES, POSTBACK_ACTIONS } from '../../types/constants.js';
import { S3UploadError } from '../../types/errors.js';
import { AIServiceError } from '../../types/errors.js';
import type {
  CaptionSet,
  IAIService,
  ILineService,
  IPublisherRegistry,
  IS3Service,
  ISessionStore,
  PostSession,
} from '../../types/index.js';

const dishes = ['滷肉飯', '雞腿排', '燙青菜'];

const captions: CaptionSet = {
  instagram: { caption: 'ig', hashtags: '#a' },
  facebook: { caption: 'fb', hashtags: '#b' },
  threads: { caption: 'th', hashtags: '#c' },
};

function createDeps(overrides: Partial<{
  lineService: ILineService;
  s3Service: IS3Service;
  aiService: IAIService;
  sessionStore: ISessionStore;
  publisherRegistry: IPublisherRegistry;
}> = {}) {
  return {
    lineService: {
      pushMessage: vi.fn().mockResolvedValue(undefined),
      replyMessage: vi.fn(),
      getMessageContent: vi.fn().mockResolvedValue(Buffer.from('img')),
      ...overrides.lineService,
    },
    s3Service: {
      upload: vi.fn().mockResolvedValue({
        key: 'uploads/test.jpg',
        url: 'https://img',
      }),
      delete: vi.fn().mockResolvedValue(undefined),
      ...overrides.s3Service,
    },
    aiService: {
      recognizeDishes: vi.fn().mockResolvedValue(dishes),
      generateCaptions: vi.fn().mockResolvedValue(captions),
      ...overrides.aiService,
    },
    sessionStore: {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
      ...overrides.sessionStore,
    },
    publisherRegistry: {
      publishAll: vi.fn().mockResolvedValue([
        { platform: 'instagram', success: true, postUrl: 'https://ig' },
        { platform: 'facebook', success: false, error: 'fail' },
        { platform: 'threads', success: true, postUrl: 'https://th' },
      ]),
      ...overrides.publisherRegistry,
    },
  };
}

describe('LineHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ignores events without a user id', async () => {
    const deps = createDeps();
    const handler = new LineHandler(deps);

    await handler.handleEvent({
      type: 'message',
      source: {},
      message: { type: 'image', id: 'm1' },
    });

    expect(deps.lineService.pushMessage).not.toHaveBeenCalled();
  });

  it('handles events from any user id', async () => {
    const deps = createDeps();
    const handler = new LineHandler(deps);

    await handler.handleEvent({
      type: 'message',
      source: { userId: 'U999' },
      message: { type: 'image', id: 'm1' },
    });

    expect(deps.lineService.pushMessage).toHaveBeenCalled();
  });

  it('ignores unknown event types', async () => {
    const deps = createDeps();
    const handler = new LineHandler(deps);

    await handler.handleEvent({
      type: 'follow',
      source: { userId: 'U123' },
    });

    expect(deps.lineService.pushMessage).not.toHaveBeenCalled();
  });

  it('handles image upload and prompts for dish names', async () => {
    const deps = createDeps();
    const handler = new LineHandler(deps);

    await handler.handleEvent({
      type: 'message',
      source: { userId: 'U123' },
      message: { type: 'image', id: 'm1' },
    });

    expect(deps.lineService.getMessageContent).toHaveBeenCalledWith('m1');
    expect(deps.s3Service.upload).toHaveBeenCalled();
    expect(deps.aiService.recognizeDishes).not.toHaveBeenCalled();
    expect(deps.aiService.generateCaptions).not.toHaveBeenCalled();
    expect(deps.sessionStore.set).toHaveBeenCalledWith(
      'U123',
      expect.objectContaining({
        status: 'pending_dish_input',
        dishes: [],
        imageUrl: 'https://img',
      }),
    );
    expect(deps.lineService.pushMessage).toHaveBeenCalledWith('U123', [
      { type: 'text', text: LINE_MESSAGES.imageProcessing },
    ]);
    expect(deps.lineService.pushMessage).toHaveBeenCalledWith('U123', [
      { type: 'text', text: LINE_MESSAGES.dishInputPrompt },
    ]);
  });

  it('pushes S3 error message when upload fails', async () => {
    const deps = createDeps({
      s3Service: {
        upload: vi.fn().mockRejectedValue(new S3UploadError()),
        delete: vi.fn(),
      },
    });
    const handler = new LineHandler(deps);

    await handler.handleEvent({
      type: 'message',
      source: { userId: 'U123' },
      message: { type: 'image', id: 'm1' },
    });

    expect(deps.sessionStore.set).not.toHaveBeenCalled();
    expect(deps.lineService.pushMessage).toHaveBeenCalledWith('U123', [
      { type: 'text', text: LINE_MESSAGES.s3UploadFailed },
    ]);
  });

  it('rejects new image while publishing', async () => {
    const deps = createDeps({
      sessionStore: {
        get: vi.fn().mockReturnValue({
          status: 'publishing',
        } as PostSession),
        set: vi.fn(),
        delete: vi.fn(),
      },
    });
    const handler = new LineHandler(deps);

    await handler.handleEvent({
      type: 'message',
      source: { userId: 'U123' },
      message: { type: 'image', id: 'm1' },
    });

    expect(deps.s3Service.upload).not.toHaveBeenCalled();
    expect(deps.lineService.pushMessage).toHaveBeenCalledWith('U123', [
      { type: 'text', text: LINE_MESSAGES.publishingInProgress },
    ]);
  });

  it('generates captions after dish confirm', async () => {
    const session: PostSession = {
      userId: 'U123',
      imageS3Key: 'uploads/test.jpg',
      imageUrl: 'https://img',
      dishes,
      createdAt: new Date(),
      status: 'pending_dish_confirm',
    };

    const deps = createDeps({
      sessionStore: {
        get: vi.fn().mockReturnValue(session),
        set: vi.fn(),
        delete: vi.fn(),
      },
    });
    const handler = new LineHandler(deps);

    await handler.handleEvent({
      type: 'postback',
      source: { userId: 'U123' },
      postback: { data: POSTBACK_ACTIONS.dishConfirm },
    });

    expect(deps.aiService.generateCaptions).toHaveBeenCalledWith(
      'https://img',
      dishes,
    );
    expect(deps.sessionStore.set).toHaveBeenCalledWith(
      'U123',
      expect.objectContaining({
        status: 'pending_confirm',
        captions,
      }),
    );
  });

  it('prompts manual dish input when dish recognition is rejected', async () => {
    const session: PostSession = {
      userId: 'U123',
      imageS3Key: 'uploads/test.jpg',
      imageUrl: 'https://img',
      dishes,
      createdAt: new Date(),
      status: 'pending_dish_confirm',
    };

    const deps = createDeps({
      sessionStore: {
        get: vi.fn().mockReturnValue(session),
        set: vi.fn(),
        delete: vi.fn(),
      },
    });
    const handler = new LineHandler(deps);

    await handler.handleEvent({
      type: 'postback',
      source: { userId: 'U123' },
      postback: { data: POSTBACK_ACTIONS.dishReject },
    });

    expect(deps.sessionStore.set).toHaveBeenCalledWith(
      'U123',
      expect.objectContaining({ status: 'pending_dish_input' }),
    );
    expect(deps.lineService.pushMessage).toHaveBeenCalledWith('U123', [
      { type: 'text', text: LINE_MESSAGES.dishInputPrompt },
    ]);
  });

  it('generates captions from manual dish input', async () => {
    const session: PostSession = {
      userId: 'U123',
      imageS3Key: 'uploads/test.jpg',
      imageUrl: 'https://img',
      dishes,
      createdAt: new Date(),
      status: 'pending_dish_input',
    };

    const manualDishes = ['牛肉麵', '滷蛋'];
    const deps = createDeps({
      sessionStore: {
        get: vi.fn().mockReturnValue(session),
        set: vi.fn(),
        delete: vi.fn(),
      },
    });
    const handler = new LineHandler(deps);

    await handler.handleEvent({
      type: 'message',
      source: { userId: 'U123' },
      message: {
        type: 'text',
        text: '牛肉麵\n滷蛋',
      },
    });

    expect(deps.aiService.generateCaptions).toHaveBeenCalledWith(
      'https://img',
      manualDishes,
    );
    expect(deps.sessionStore.set).toHaveBeenCalledWith(
      'U123',
      expect.objectContaining({
        status: 'pending_confirm',
        dishes: manualDishes,
        captions,
      }),
    );
  });

  it('rejects manual dish input with more than five dishes', async () => {
    const session: PostSession = {
      userId: 'U123',
      imageS3Key: 'uploads/test.jpg',
      imageUrl: 'https://img',
      dishes,
      createdAt: new Date(),
      status: 'pending_dish_input',
    };

    const deps = createDeps({
      sessionStore: {
        get: vi.fn().mockReturnValue(session),
        set: vi.fn(),
        delete: vi.fn(),
      },
    });
    const handler = new LineHandler(deps);

    await handler.handleEvent({
      type: 'message',
      source: { userId: 'U123' },
      message: { type: 'text', text: 'a\nb\nc\nd\ne\nf' },
    });

    expect(deps.aiService.generateCaptions).not.toHaveBeenCalled();
    expect(deps.lineService.pushMessage).toHaveBeenCalledWith('U123', [
      { type: 'text', text: LINE_MESSAGES.dishInputInvalid },
    ]);
  });

  it('handles confirm flow', async () => {
    const session: PostSession = {
      userId: 'U123',
      imageS3Key: 'uploads/test.jpg',
      imageUrl: 'https://img',
      dishes,
      captions,
      createdAt: new Date(),
      status: 'pending_confirm',
    };

    const deps = createDeps({
      sessionStore: {
        get: vi.fn().mockReturnValue(session),
        set: vi.fn(),
        delete: vi.fn(),
      },
    });
    const handler = new LineHandler(deps);

    await handler.handleEvent({
      type: 'postback',
      source: { userId: 'U123' },
      postback: { data: POSTBACK_ACTIONS.confirm },
    });

    expect(deps.publisherRegistry.publishAll).toHaveBeenCalled();
    expect(deps.s3Service.delete).toHaveBeenCalledWith('uploads/test.jpg');
    expect(deps.sessionStore.delete).toHaveBeenCalledWith('U123');
  });

  it('pushes expired message when confirm has no session', async () => {
    const deps = createDeps({
      sessionStore: {
        get: vi.fn().mockReturnValue(undefined),
        set: vi.fn(),
        delete: vi.fn(),
      },
    });
    const handler = new LineHandler(deps);

    await handler.handleEvent({
      type: 'postback',
      source: { userId: 'U123' },
      postback: { data: POSTBACK_ACTIONS.confirm },
    });

    expect(deps.publisherRegistry.publishAll).not.toHaveBeenCalled();
    expect(deps.lineService.pushMessage).toHaveBeenCalledWith('U123', [
      { type: 'text', text: LINE_MESSAGES.sessionExpired },
    ]);
  });

  it('regenerates captions from existing session dishes', async () => {
    const session: PostSession = {
      userId: 'U123',
      imageS3Key: 'uploads/test.jpg',
      imageUrl: 'https://img',
      dishes,
      captions,
      createdAt: new Date(),
      status: 'pending_confirm',
    };

    const deps = createDeps({
      sessionStore: {
        get: vi.fn().mockReturnValue(session),
        set: vi.fn(),
        delete: vi.fn(),
      },
    });
    const handler = new LineHandler(deps);

    await handler.handleEvent({
      type: 'postback',
      source: { userId: 'U123' },
      postback: { data: POSTBACK_ACTIONS.regenerate },
    });

    expect(deps.aiService.generateCaptions).toHaveBeenCalledWith(
      'https://img',
      dishes,
    );
    expect(deps.sessionStore.set).toHaveBeenCalled();
  });

  it('restores preview quick replies when regenerate fails', async () => {
    const session: PostSession = {
      userId: 'U123',
      imageS3Key: 'uploads/test.jpg',
      imageUrl: 'https://img',
      dishes,
      captions,
      createdAt: new Date(),
      status: 'pending_confirm',
    };

    const deps = createDeps({
      aiService: {
        recognizeDishes: vi.fn(),
        generateCaptions: vi
          .fn()
          .mockRejectedValue(new AIServiceError('fail')),
      },
      sessionStore: {
        get: vi.fn().mockReturnValue(session),
        set: vi.fn(),
        delete: vi.fn(),
      },
    });
    const handler = new LineHandler(deps);

    await handler.handleEvent({
      type: 'postback',
      source: { userId: 'U123' },
      postback: { data: POSTBACK_ACTIONS.regenerate },
    });

    expect(deps.lineService.pushMessage).toHaveBeenCalledWith('U123', [
      { type: 'text', text: LINE_MESSAGES.aiFailed },
    ]);
    expect(deps.lineService.pushMessage).toHaveBeenCalledWith('U123', [
      expect.objectContaining({
        type: 'text',
        text: expect.stringContaining('請確認以下文案'),
        quickReply: expect.anything(),
      }),
    ]);
  });

  it('prompts for dishes when regenerate has empty dish list', async () => {
    const session: PostSession = {
      userId: 'U123',
      imageS3Key: 'uploads/test.jpg',
      imageUrl: 'https://img',
      dishes: [],
      captions,
      createdAt: new Date(),
      status: 'pending_confirm',
    };

    const deps = createDeps({
      sessionStore: {
        get: vi.fn().mockReturnValue(session),
        set: vi.fn(),
        delete: vi.fn(),
      },
    });
    const handler = new LineHandler(deps);

    await handler.handleEvent({
      type: 'postback',
      source: { userId: 'U123' },
      postback: { data: POSTBACK_ACTIONS.regenerate },
    });

    expect(deps.aiService.generateCaptions).not.toHaveBeenCalled();
    expect(deps.sessionStore.set).toHaveBeenCalledWith(
      'U123',
      expect.objectContaining({ status: 'pending_dish_input' }),
    );
    expect(deps.lineService.pushMessage).toHaveBeenCalledWith('U123', [
      { type: 'text', text: LINE_MESSAGES.dishInputPrompt },
    ]);
  });

  it('cancels session and deletes S3 object', async () => {
    const session: PostSession = {
      userId: 'U123',
      imageS3Key: 'uploads/test.jpg',
      imageUrl: 'https://img',
      dishes,
      captions,
      createdAt: new Date(),
      status: 'pending_confirm',
    };

    const deps = createDeps({
      sessionStore: {
        get: vi.fn().mockReturnValue(session),
        set: vi.fn(),
        delete: vi.fn(),
      },
    });
    const handler = new LineHandler(deps);

    await handler.handleEvent({
      type: 'postback',
      source: { userId: 'U123' },
      postback: { data: POSTBACK_ACTIONS.cancel },
    });

    expect(deps.s3Service.delete).toHaveBeenCalledWith('uploads/test.jpg');
    expect(deps.sessionStore.delete).toHaveBeenCalledWith('U123');
    expect(deps.lineService.pushMessage).toHaveBeenCalledWith('U123', [
      { type: 'text', text: LINE_MESSAGES.cancelled },
    ]);
  });

  it('starts edit flow and prompts user for new caption', async () => {
    const session: PostSession = {
      userId: 'U123',
      imageS3Key: 'uploads/test.jpg',
      imageUrl: 'https://img',
      dishes,
      captions,
      createdAt: new Date(),
      status: 'pending_confirm',
    };

    const deps = createDeps({
      sessionStore: {
        get: vi.fn().mockReturnValue(session),
        set: vi.fn(),
        delete: vi.fn(),
      },
    });
    const handler = new LineHandler(deps);

    await handler.handleEvent({
      type: 'postback',
      source: { userId: 'U123' },
      postback: { data: POSTBACK_ACTIONS.edit },
    });

    expect(deps.sessionStore.set).toHaveBeenCalledWith(
      'U123',
      expect.objectContaining({
        status: 'pending_edit',
      }),
    );
    expect(deps.lineService.pushMessage).toHaveBeenCalledWith('U123', [
      { type: 'text', text: LINE_MESSAGES.editPrompt },
    ]);
  });

  it('saves edited caption to all platforms and shows preview again', async () => {
    const session: PostSession = {
      userId: 'U123',
      imageS3Key: 'uploads/test.jpg',
      imageUrl: 'https://img',
      dishes,
      captions,
      createdAt: new Date(),
      status: 'pending_edit',
    };

    const deps = createDeps({
      sessionStore: {
        get: vi.fn().mockReturnValue(session),
        set: vi.fn(),
        delete: vi.fn(),
      },
    });
    const handler = new LineHandler(deps);

    await handler.handleEvent({
      type: 'message',
      source: { userId: 'U123' },
      message: { type: 'text', text: 'new caption #tag' },
    });

    expect(deps.sessionStore.set).toHaveBeenCalledWith(
      'U123',
      expect.objectContaining({
        status: 'pending_confirm',
        captions: {
          instagram: { caption: 'new caption #tag', hashtags: '' },
          facebook: { caption: 'new caption #tag', hashtags: '' },
          threads: { caption: 'new caption #tag', hashtags: '' },
        },
      }),
    );
    expect(deps.lineService.pushMessage).toHaveBeenCalledWith('U123', [
      expect.objectContaining({
        type: 'text',
        text: '請確認以下文案：\n\nnew caption #tag',
      }),
    ]);
  });
});
