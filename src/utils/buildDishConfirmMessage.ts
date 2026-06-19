import type { LineMessage } from '../types/index.js';
import { POSTBACK_ACTIONS } from '../types/constants.js';
import { formatDishList } from './formatDishList.js';

/**
 * Build a dish recognition confirmation message with Quick Reply actions.
 */
export function buildDishConfirmMessage(dishes: string[]): LineMessage {
  return {
    type: 'text',
    text: `辨識到以下主菜，請確認是否正確：\n\n${formatDishList(dishes)}`,
    quickReply: {
      items: [
        {
          type: 'action',
          action: {
            type: 'postback',
            label: '✅ 沒問題',
            data: POSTBACK_ACTIONS.dishConfirm,
          },
        },
        {
          type: 'action',
          action: {
            type: 'postback',
            label: '❌ 辨識錯誤，我要自行輸入',
            data: POSTBACK_ACTIONS.dishReject,
          },
        },
      ],
    },
  };
}
