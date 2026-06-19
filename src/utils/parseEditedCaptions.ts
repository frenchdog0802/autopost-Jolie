import type { CaptionSet, PlatformCaption } from '../types/index.js';

const PLATFORM_LABELS = {
  instagram: '📸 Instagram',
  facebook: '📘 Facebook',
  threads: '🧵 Threads',
} as const;

const PLATFORM_ORDER = ['instagram', 'facebook', 'threads'] as const;

function splitCaptionAndHashtags(content: string): PlatformCaption {
  const trimmed = content.trim();
  if (!trimmed) {
    return { caption: '', hashtags: '' };
  }

  const lines = trimmed.split('\n');
  const hashtagLines: string[] = [];
  let captionEnd = lines.length - 1;

  while (captionEnd >= 0) {
    const line = lines[captionEnd]?.trim() ?? '';
    if (!line) {
      captionEnd--;
      continue;
    }

    if (line.split(/\s+/).every((token) => token.startsWith('#'))) {
      hashtagLines.unshift(line);
      captionEnd--;
      continue;
    }

    break;
  }

  return {
    caption: lines.slice(0, captionEnd + 1).join('\n').trim(),
    hashtags: hashtagLines.join(' ').trim(),
  };
}

function tryParseMultiPlatformPreview(text: string): CaptionSet | null {
  const normalized = text.replace(/^請確認以下文案：\s*/u, '').trim();
  const hasAllLabels = PLATFORM_ORDER.every((platform) =>
    normalized.includes(PLATFORM_LABELS[platform]),
  );

  if (!hasAllLabels) {
    return null;
  }

  const captions: Partial<Record<(typeof PLATFORM_ORDER)[number], PlatformCaption>> =
    {};

  for (let i = 0; i < PLATFORM_ORDER.length; i++) {
    const platform = PLATFORM_ORDER[i];
    const label = PLATFORM_LABELS[platform];
    const start = normalized.indexOf(label);
    if (start === -1) {
      continue;
    }

    const contentStart = start + label.length;
    const nextPlatform = PLATFORM_ORDER[i + 1];
    const nextLabel = nextPlatform ? PLATFORM_LABELS[nextPlatform] : undefined;
    const end = nextLabel
      ? normalized.indexOf(nextLabel, contentStart)
      : normalized.length;

    captions[platform] = splitCaptionAndHashtags(
      normalized.slice(contentStart, end),
    );
  }

  return {
    instagram: captions.instagram ?? { caption: '', hashtags: '' },
    facebook: captions.facebook ?? { caption: '', hashtags: '' },
    threads: captions.threads ?? { caption: '', hashtags: '' },
  };
}

/**
 * Parse user-edited caption text into a CaptionSet.
 * Detects pasted multi-platform previews; otherwise applies plain text to all platforms.
 */
export function parseEditedCaptions(text: string): CaptionSet {
  const trimmed = text.trim();
  const parsed = tryParseMultiPlatformPreview(trimmed);
  if (parsed) {
    return parsed;
  }

  const platformCaption = { caption: trimmed, hashtags: '' };
  return {
    instagram: platformCaption,
    facebook: platformCaption,
    threads: platformCaption,
  };
}

/** Whether all three platform captions are identical. */
export function captionsAreIdentical(captions: CaptionSet): boolean {
  const key = (caption: PlatformCaption) =>
    `${caption.caption}\0${caption.hashtags}`;

  return (
    key(captions.instagram) === key(captions.facebook) &&
    key(captions.facebook) === key(captions.threads)
  );
}
