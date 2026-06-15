import { describe, expect, it } from 'vitest';
import { LINE_MESSAGES, PLATFORMS, POSTBACK_ACTIONS } from '../constants.js';

describe('constants', () => {
  it('defines POSTBACK_ACTIONS matching design.md event routing', () => {
    expect(POSTBACK_ACTIONS.confirm).toBe('action=confirm');
    expect(POSTBACK_ACTIONS.regenerate).toBe('action=regenerate');
    expect(POSTBACK_ACTIONS.cancel).toBe('action=cancel');
  });

  it('defines PLATFORMS in instagram, facebook, threads order', () => {
    expect(PLATFORMS).toEqual(['instagram', 'facebook', 'threads']);
  });

  it('defines LINE message templates for user-facing feedback', () => {
    expect(LINE_MESSAGES.imageProcessing).toBe('⏳ 圖片分析中...');
    expect(LINE_MESSAGES.publishing).toBe('⏳ 發布中...');
    expect(LINE_MESSAGES.s3UploadFailed).toBe('圖片上傳失敗，請稍後再試');
    expect(LINE_MESSAGES.aiFailed).toBe('AI 文案生成失敗，請稍後再試');
    expect(LINE_MESSAGES.sessionExpired).toBe('操作已過期，請重新上傳圖片');
    expect(LINE_MESSAGES.publishingInProgress).toBe(
      '目前有貼文正在發布中，請稍後再試',
    );
    expect(LINE_MESSAGES.cancelled).toBe('已取消');
  });
});
