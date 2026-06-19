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

const validDishJson = JSON.stringify({
  dishes: ['滷肉飯', '雞腿排'],
});

const validCaptionJson = JSON.stringify({
  instagram: { caption: 'ig', hashtags: '#a' },
  facebook: { caption: 'fb', hashtags: '#b' },
  threads: { caption: 'th', hashtags: '#c' },
});

describe('OpenAIService', () => {
  let client: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    client = createMockClient();
  });

  it('recognizes dishes with json response format', async () => {
    client.chat.completions.create.mockResolvedValue({
      choices: [{ message: { content: validDishJson } }],
      usage: { total_tokens: 50 },
    });

    const service = new OpenAIService({
      config: { OPENAI_API_KEY: 'key' },
      client: client as never,
    });

    const dishes = await service.recognizeDishes('https://img');

    expect(dishes).toEqual(['滷肉飯', '雞腿排']);
    expect(client.chat.completions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
      }),
    );
  });

  it('throws AIServiceError for invalid dish JSON shape', async () => {
    client.chat.completions.create.mockResolvedValue({
      choices: [{ message: { content: '{"dishes":[]}' } }],
    });

    const service = new OpenAIService({
      config: { OPENAI_API_KEY: 'key' },
      client: client as never,
    });

    await expect(service.recognizeDishes('https://img')).rejects.toBeInstanceOf(
      AIServiceError,
    );
    expect(client.chat.completions.create).toHaveBeenCalledTimes(2);
  });

  it('calls gpt-4o-mini with json response format for captions', async () => {
    client.chat.completions.create.mockResolvedValue({
      choices: [{ message: { content: validCaptionJson } }],
      usage: { total_tokens: 100 },
    });

    const service = new OpenAIService({
      config: { OPENAI_API_KEY: 'key' },
      client: client as never,
    });

    const captions = await service.generateCaptions('https://img', ['滷肉飯']);

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

  it('throws AIServiceError for invalid caption JSON shape', async () => {
    client.chat.completions.create.mockResolvedValue({
      choices: [{ message: { content: '{"instagram":{}}' } }],
    });

    const service = new OpenAIService({
      config: { OPENAI_API_KEY: 'key' },
      client: client as never,
    });

    await expect(
      service.generateCaptions('https://img', ['滷肉飯']),
    ).rejects.toBeInstanceOf(AIServiceError);
    expect(client.chat.completions.create).toHaveBeenCalledTimes(2);
  });

  it('retries once on 429 and succeeds', async () => {
    client.chat.completions.create
      .mockRejectedValueOnce({ status: 429 })
      .mockResolvedValueOnce({
        choices: [{ message: { content: validCaptionJson } }],
      });

    const service = new OpenAIService({
      config: { OPENAI_API_KEY: 'key' },
      client: client as never,
    });

    const captions = await service.generateCaptions('https://img', ['滷肉飯']);
    expect(captions.facebook.caption).toBe('fb');
    expect(client.chat.completions.create).toHaveBeenCalledTimes(2);
  });
});
