import type { PublishResult } from '../types/index.js';

const PLATFORM_LABELS: Record<PublishResult['platform'], string> = {
  instagram: '📸 Instagram',
  facebook: '📘 Facebook',
  threads: '🧵 Threads',
};

/**
 * Format per-platform publish results into a LINE user message.
 */
export function formatPublishResults(results: PublishResult[]): string {
  const successCount = results.filter((result) => result.success).length;

  if (successCount === 0) {
    return '❌ 發布失敗，請稍後再試';
  }

  const lines = results.map((result) => {
    const label = PLATFORM_LABELS[result.platform];
    if (result.success && result.postUrl) {
      return `✅ ${label}: ${result.postUrl}`;
    }

    return `❌ ${label}: ${result.error ?? '未知錯誤'}`;
  });

  if (successCount === results.length) {
    return `✅ 發布成功！\n${lines.join('\n')}`;
  }

  return `⚠️ 部分發布失敗\n${lines.join('\n')}`;
}
