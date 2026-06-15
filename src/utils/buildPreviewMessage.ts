import type { CaptionSet, LineMessage } from '../types/index.js';
import { POSTBACK_ACTIONS } from '../types/constants.js';

const PLATFORM_LABELS = {
  instagram: '📸 Instagram',
  facebook: '📘 Facebook',
  threads: '🧵 Threads',
} as const;

/**
 * Build a preview text message with Quick Reply actions for caption confirmation.
 */
export function buildPreviewMessage(captions: CaptionSet): LineMessage {
  const preview = (['instagram', 'facebook', 'threads'] as const)
    .map((platform) => {
      const { caption, hashtags } = captions[platform];
      return `${PLATFORM_LABELS[platform]}\n${caption}\n${hashtags}`;
    })
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
            label: '✏️ 改 IG',
            data: POSTBACK_ACTIONS.editInstagram,
          },
        },
        {
          type: 'action',
          action: {
            type: 'postback',
            label: '✏️ 改 FB',
            data: POSTBACK_ACTIONS.editFacebook,
          },
        },
        {
          type: 'action',
          action: {
            type: 'postback',
            label: '✏️ 改 Threads',
            data: POSTBACK_ACTIONS.editThreads,
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
