import type { Platform } from './index.js';

/** Quick Reply postback data values for the confirmation flow. */
export const POSTBACK_ACTIONS = {
  confirm: 'action=confirm',
  edit: 'action=edit',
  regenerate: 'action=regenerate',
  cancel: 'action=cancel',
} as const;

/** Supported social publishing platforms in display order. */
export const PLATFORMS: readonly Platform[] = [
  'instagram',
  'facebook',
  'threads',
] as const;

/** User-facing LINE message templates for the post flow. */
export const LINE_MESSAGES = {
  imageProcessing: '⏳ 圖片分析中...',
  publishing: '⏳ 發布中...',
  s3UploadFailed: '圖片上傳失敗，請稍後再試',
  aiFailed: 'AI 文案生成失敗，請稍後再試',
  sessionExpired: '操作已過期，請重新上傳圖片',
  publishingInProgress: '目前有貼文正在發布中，請稍後再試',
  cancelled: '已取消',
  editPrompt: '請輸入新文案（含 hashtag）：',
} as const;
