import type { CaptionSet, LineMessage } from '../types/index.js';
import { POSTBACK_ACTIONS } from '../types/constants.js';
import { captionsAreIdentical } from './parseEditedCaptions.js';

const PLATFORM_LABELS = {
  instagram: '📸 Instagram',
  facebook: '📘 Facebook',
  threads: '🧵 Threads',
} as const;

/**
 * Build a preview text message with Quick Reply actions for caption confirmation.
 */
export function buildPreviewMessage(captions: CaptionSet): LineMessage {
  const preview = captionsAreIdentical(captions)
    ? formatSingleCaption(captions.instagram)
    : (['instagram', 'facebook', 'threads'] as const)
        .map((platform) => formatPlatformSection(platform, captions[platform]))
        .join('\n\n');

  return {
    type: 'text',
    text: `請確認以下文案：\n\n${preview}`,
    quickReply: {
      items: [
        {
          type: 'action',
          action: {
            type: 'postback',
            label: '✅ 發文',
            data: POSTBACK_ACTIONS.confirm,
          },
        },
        {
          type: 'action',
          action: {
            type: 'postback',
            label: '✏️ 編輯貼文',
            data: POSTBACK_ACTIONS.edit,
          },
        },
        {
          type: 'action',
          action: {
            type: 'postback',
            label: '🔄 重新生成',
            data: POSTBACK_ACTIONS.regenerate,
          },
        },
        {
          type: 'action',
          action: {
            type: 'postback',
            label: '❌ 取消',
            data: POSTBACK_ACTIONS.cancel,
          },
        },
      ],
    },
  };
}

function formatPlatformSection(
  platform: keyof typeof PLATFORM_LABELS,
  { caption, hashtags }: CaptionSet[keyof CaptionSet],
): string {
  return hashtags
    ? `${PLATFORM_LABELS[platform]}\n${caption}\n${hashtags}`
    : `${PLATFORM_LABELS[platform]}\n${caption}`;
}

function formatSingleCaption({ caption, hashtags }: CaptionSet['instagram']): string {
  return hashtags ? `${caption}\n\n${hashtags}` : caption;
}
