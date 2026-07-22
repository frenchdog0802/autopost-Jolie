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

const serviceConfig = {
  OPENAI_API_KEY: 'openai-key',
  DEEPSEEK_API_KEY: 'deepseek-key',
};

describe('OpenAIService', () => {
  let recognitionClient: ReturnType<typeof createMockClient>;
  let captionClient: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    recognitionClient = createMockClient();
    captionClient = createMockClient();
  });

  it('recognizes dishes with OpenAI vision and json response format', async () => {
    recognitionClient.chat.completions.create.mockResolvedValue({
      choices: [{ message: { content: validDishJson } }],
      usage: { total_tokens: 50 },
    });

    const service = new OpenAIService({
      config: serviceConfig,
      recognitionClient: recognitionClient as never,
      captionClient: captionClient as never,
    });

    const dishes = await service.recognizeDishes('https://img');

    expect(dishes).toEqual(['滷肉飯', '雞腿排']);
    expect(recognitionClient.chat.completions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-4o',
        response_format: { type: 'json_object' },
      }),
    );
    expect(captionClient.chat.completions.create).not.toHaveBeenCalled();
  });

  it('throws AIServiceError for invalid dish JSON shape', async () => {
    recognitionClient.chat.completions.create.mockResolvedValue({
      choices: [{ message: { content: '{"dishes":[]}' } }],
    });

    const service = new OpenAIService({
      config: serviceConfig,
      recognitionClient: recognitionClient as never,
      captionClient: captionClient as never,
    });

    await expect(service.recognizeDishes('https://img')).rejects.toBeInstanceOf(
      AIServiceError,
    );
    expect(recognitionClient.chat.completions.create).toHaveBeenCalledTimes(2);
  });

  it('calls DeepSeek with json response format for captions', async () => {
    captionClient.chat.completions.create.mockResolvedValue({
      choices: [{ message: { content: validCaptionJson } }],
      usage: { total_tokens: 100 },
    });

    const service = new OpenAIService({
      config: serviceConfig,
      recognitionClient: recognitionClient as never,
      captionClient: captionClient as never,
    });

    const captions = await service.generateCaptions('https://img', ['滷肉飯']);

    expect(captions.instagram.caption).toBe('ig');
    expect(captionClient.chat.completions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'deepseek-v4-flash',
        max_tokens: 4000,
        temperature: 0.75,
        response_format: { type: 'json_object' },
        messages: [
          expect.objectContaining({ role: 'system' }),
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('菜色1: 滷肉飯'),
          }),
        ],
      }),
    );
    expect(recognitionClient.chat.completions.create).not.toHaveBeenCalled();
  });

  it('throws AIServiceError for invalid caption JSON shape', async () => {
    captionClient.chat.completions.create.mockResolvedValue({
      choices: [{ message: { content: '{"instagram":{}}' } }],
    });

    const service = new OpenAIService({
      config: serviceConfig,
      recognitionClient: recognitionClient as never,
      captionClient: captionClient as never,
    });

    await expect(
      service.generateCaptions('https://img', ['滷肉飯']),
    ).rejects.toBeInstanceOf(AIServiceError);
    expect(captionClient.chat.completions.create).toHaveBeenCalledTimes(2);
  });

  it('retries once on 429 and succeeds', async () => {
    captionClient.chat.completions.create
      .mockRejectedValueOnce({ status: 429 })
      .mockResolvedValueOnce({
        choices: [{ message: { content: validCaptionJson } }],
      });

    const service = new OpenAIService({
      config: serviceConfig,
      recognitionClient: recognitionClient as never,
      captionClient: captionClient as never,
    });

    const captions = await service.generateCaptions('https://img', ['滷肉飯']);
    expect(captions.facebook.caption).toBe('fb');
    expect(captionClient.chat.completions.create).toHaveBeenCalledTimes(2);
  });
});
