import { describe, expect, it, vi } from 'vitest';
import type { IPublisher, PublishResult } from '../../types/index.js';
import { PublisherRegistry } from '../publisherRegistry.js';

const captions = {
  instagram: { caption: 'ig', hashtags: '#a' },
  facebook: { caption: 'fb', hashtags: '#b' },
  threads: { caption: 'th', hashtags: '#c' },
};

function createPublisher(result: PublishResult): IPublisher {
  return {
    publish: vi.fn().mockResolvedValue(result),
  };
}

describe('PublisherRegistry', () => {
  it('returns all successful results in platform order', async () => {
    const registry = new PublisherRegistry({
      instagram: createPublisher({
        platform: 'instagram',
        success: true,
        postUrl: 'https://ig',
      }),
      facebook: createPublisher({
        platform: 'facebook',
        success: true,
        postUrl: 'https://fb',
      }),
      threads: createPublisher({
        platform: 'threads',
        success: true,
        postUrl: 'https://th',
      }),
    });

    const results = await registry.publishAll('https://img', captions);

    expect(results.map((item) => item.platform)).toEqual([
      'instagram',
      'facebook',
      'threads',
    ]);
    expect(results.every((item) => item.success)).toBe(true);
  });

  it('isolates partial failures', async () => {
    const registry = new PublisherRegistry({
      instagram: createPublisher({
        platform: 'instagram',
        success: true,
        postUrl: 'https://ig',
      }),
      facebook: {
        publish: vi.fn().mockRejectedValue(new Error('fb down')),
      },
      threads: createPublisher({
        platform: 'threads',
        success: true,
        postUrl: 'https://th',
      }),
    });

    const results = await registry.publishAll('https://img', captions);

    expect(results[1]).toEqual({
      platform: 'facebook',
      success: false,
      error: 'fb down',
    });
  });
});
