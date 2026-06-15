import type { CaptionSet, IPublisher, IPublisherRegistry, PublishResult } from '../types/index.js';
import { PLATFORMS } from '../types/constants.js';

export interface PublisherRegistryDeps {
  instagram: IPublisher;
  facebook: IPublisher;
  threads: IPublisher;
}

/**
 * Publishes to all configured platforms in parallel with isolated failures.
 */
export class PublisherRegistry implements IPublisherRegistry {
  private readonly publishers: [IPublisher, IPublisher, IPublisher];

  constructor(deps: PublisherRegistryDeps) {
    this.publishers = [deps.instagram, deps.facebook, deps.threads];
  }

  async publishAll(
    imageUrl: string,
    captions: CaptionSet,
  ): Promise<PublishResult[]> {
    const tasks = [
      this.publishers[0].publish(
        imageUrl,
        captions.instagram.caption,
        captions.instagram.hashtags,
      ),
      this.publishers[1].publish(
        imageUrl,
        captions.facebook.caption,
        captions.facebook.hashtags,
      ),
      this.publishers[2].publish(
        imageUrl,
        captions.threads.caption,
        captions.threads.hashtags,
      ),
    ];

    const results = await Promise.allSettled(tasks);

    return results.map((result, index) => {
      const platform = PLATFORMS[index]!;

      if (result.status === 'fulfilled') {
        return result.value;
      }

      const reason = result.reason;
      const errorMessage =
        reason instanceof Error ? reason.message : 'Unknown publish error';

      return {
        platform,
        success: false,
        error: errorMessage,
      };
    });
  }
}
