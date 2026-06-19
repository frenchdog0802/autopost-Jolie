import { describe, expect, it } from 'vitest';
import { POSTBACK_ACTIONS } from '../../types/constants.js';
import { buildDishConfirmMessage } from '../buildDishConfirmMessage.js';

describe('buildDishConfirmMessage', () => {
  it('formats dishes and includes two Quick Reply actions', () => {
    const message = buildDishConfirmMessage(['滷肉飯', '雞腿排', '燙青菜']);

    expect(message.text).toContain('辨識到以下主菜');
    expect(message.text).toContain('菜色1: 滷肉飯');
    expect(message.text).toContain('菜色2: 雞腿排');
    expect(message.text).toContain('菜色3: 燙青菜');

    const items = message.quickReply?.items ?? [];
    expect(items).toHaveLength(2);
    expect(items.map((item) => item.action.data)).toEqual([
      POSTBACK_ACTIONS.dishConfirm,
      POSTBACK_ACTIONS.dishReject,
    ]);
  });
});
