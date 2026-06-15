import type { CaptionSet, Platform, PlatformCaption } from '../types/index.js';
import { AIServiceError } from '../types/errors.js';
import { PLATFORMS } from '../types/constants.js';

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeHashtags(record: Record<string, unknown>): string {
  const raw = record.hashtags ?? record.tags;

  if (typeof raw === 'string') {
    return raw.trim();
  }

  if (Array.isArray(raw)) {
    return raw
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean)
      .join(' ');
  }

  return '';
}

function extractHashtagsFromCaption(caption: string): {
  caption: string;
  hashtags: string;
} {
  const tags = caption.match(/#[\w\u4e00-\u9fff]+/g);
  if (!tags?.length) {
    return { caption, hashtags: '' };
  }

  return {
    caption: caption
      .replace(/#[\w\u4e00-\u9fff]+/g, '')
      .replace(/\s+/g, ' ')
      .trim(),
    hashtags: tags.join(' '),
  };
}

function parsePlatformCaption(raw: unknown, platform: Platform): PlatformCaption {
  if (typeof raw !== 'object' || raw === null) {
    throw new AIServiceError(`Invalid caption payload for ${platform}`);
  }

  const record = raw as Record<string, unknown>;
  let caption = normalizeString(record.caption) || normalizeString(record.text);
  let hashtags = normalizeHashtags(record);

  if (caption && !hashtags) {
    const extracted = extractHashtagsFromCaption(caption);
    caption = extracted.caption;
    hashtags = extracted.hashtags;
  }

  if (!isNonEmptyString(caption)) {
    throw new AIServiceError(`Missing caption or hashtags for ${platform}`);
  }

  return {
    caption,
    hashtags,
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
