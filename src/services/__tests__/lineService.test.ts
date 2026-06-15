import { describe, expect, it, vi } from 'vitest';
import { LineService } from '../lineService.js';

describe('LineService', () => {
  it('pushMessage forwards user and messages to SDK client', async () => {
    const pushMessage = vi.fn().mockResolvedValue(undefined);
    const service = new LineService({
      config: { LINE_CHANNEL_ACCESS_TOKEN: 'token' },
      client: { pushMessage, replyMessage: vi.fn() } as never,
      blobClient: { getMessageContent: vi.fn() } as never,
    });

    await service.pushMessage('U123', [{ type: 'text', text: 'hello' }]);

    expect(pushMessage).toHaveBeenCalledWith({
      to: 'U123',
      messages: [{ type: 'text', text: 'hello' }],
    });
  });

  it('getMessageContent returns a buffer from stream chunks', async () => {
    async function* stream() {
      yield new Uint8Array([1, 2, 3]);
    }

    const service = new LineService({
      config: { LINE_CHANNEL_ACCESS_TOKEN: 'token' },
      client: { pushMessage: vi.fn(), replyMessage: vi.fn() } as never,
      blobClient: {
        getMessageContent: vi.fn().mockResolvedValue(stream()),
      } as never,
    });

    const buffer = await service.getMessageContent('msg-1');
    expect(Buffer.from(buffer).equals(Buffer.from([1, 2, 3]))).toBe(true);
  });

  it('getMessageContent propagates errors', async () => {
    const service = new LineService({
      config: { LINE_CHANNEL_ACCESS_TOKEN: 'token' },
      client: { pushMessage: vi.fn(), replyMessage: vi.fn() } as never,
      blobClient: {
        getMessageContent: vi.fn().mockRejectedValue(new Error('404')),
      } as never,
    });

    await expect(service.getMessageContent('missing')).rejects.toThrow('404');
  });
});
