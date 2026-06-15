import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OpenAIService } from '../openaiService.js';
import { AIServiceError } from '../../types/errors.js';

const createMockClient = () => ({
  chat: {
    completions: {
      create: vi.fn(),
    },
  },
});

const validJson = JSON.stringify({
  instagram: { caption: 'ig', hashtags: '#a' },
  facebook: { caption: 'fb', hashtags: '#b' },
  threads: { caption: 'th', hashtags: '#c' },
});

describe('OpenAIService', () => {
  let client: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    client = createMockClient();
  });

  it('calls gpt-4o-mini with json response format', async () => {
    client.chat.completions.create.mockResolvedValue({
      choices: [{ message: { content: validJson } }],
      usage: { total_tokens: 100 },
    });

    const service = new OpenAIService({
      config: { OPENAI_API_KEY: 'key' },
      client: client as never,
    });

    const captions = await service.generateCaptions('https://img');

    expect(captions.instagram.caption).toBe('ig');
    expect(client.chat.completions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-4o-mini',
        max_tokens: 1000,
        temperature: 0.7,
        response_format: { type: 'json_object' },
      }),
    );
  });

  it('throws AIServiceError for invalid JSON shape', async () => {
    client.chat.completions.create.mockResolvedValue({
      choices: [{ message: { content: '{"instagram":{}}' } }],
    });

    const service = new OpenAIService({
      config: { OPENAI_API_KEY: 'key' },
      client: client as never,
    });

    await expect(service.generateCaptions('https://img')).rejects.toBeInstanceOf(
      AIServiceError,
    );
    expect(client.chat.completions.create).toHaveBeenCalledTimes(2);
  });

  it('retries once on 429 and succeeds', async () => {
    client.chat.completions.create
      .mockRejectedValueOnce({ status: 429 })
      .mockResolvedValueOnce({
        choices: [{ message: { content: validJson } }],
      });

    const service = new OpenAIService({
      config: { OPENAI_API_KEY: 'key' },
      client: client as never,
    });

    const captions = await service.generateCaptions('https://img');
    expect(captions.facebook.caption).toBe('fb');
    expect(client.chat.completions.create).toHaveBeenCalledTimes(2);
  });
});
