import type { CaptionSet, Platform, PlatformCaption } from '../types/index.js';
import { AIServiceError } from '../types/errors.js';
import { PLATFORMS } from '../types/constants.js';

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function parsePlatformCaption(raw: unknown, platform: Platform): PlatformCaption {
  if (typeof raw !== 'object' || raw === null) {
    throw new AIServiceError(`Invalid caption payload for ${platform}`);
  }

  const record = raw as Record<string, unknown>;
  if (!isNonEmptyString(record.caption) || !isNonEmptyString(record.hashtags)) {
    throw new AIServiceError(`Missing caption or hashtags for ${platform}`);
  }

  return {
    caption: record.caption.trim(),
    hashtags: record.hashtags.trim(),
  };
}

/**
 * Validate OpenAI JSON output matches the CaptionSet contract.
 */
export function validateCaptionSet(raw: unknown): CaptionSet {
  if (typeof raw !== 'object' || raw === null) {
    throw new AIServiceError('AI response is not a JSON object');
  }

  const record = raw as Record<string, unknown>;

  return {
    instagram: parsePlatformCaption(record.instagram, 'instagram'),
    facebook: parsePlatformCaption(record.facebook, 'facebook'),
    threads: parsePlatformCaption(record.threads, 'threads'),
  };
}

export { PLATFORMS };
