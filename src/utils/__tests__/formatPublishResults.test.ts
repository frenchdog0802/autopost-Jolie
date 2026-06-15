import { describe, expect, it } from 'vitest';
import type { PublishResult } from '../../types/index.js';
import { formatPublishResults } from '../formatPublishResults.js';

describe('formatPublishResults', () => {
  it('formats all success message', () => {
    const results: PublishResult[] = [
      { platform: 'instagram', success: true, postUrl: 'https://ig' },
      { platform: 'facebook', success: true, postUrl: 'https://fb' },
      { platform: 'threads', success: true, postUrl: 'https://th' },
    ];

    const message = formatPublishResults(results);

    expect(message).toContain('✅ 發布成功');
    expect(message).toContain('https://ig');
  });

  it('formats partial failure message', () => {
    const results: PublishResult[] = [
      { platform: 'instagram', success: true, postUrl: 'https://ig' },
      { platform: 'facebook', success: false, error: 'failed' },
      { platform: 'threads', success: true, postUrl: 'https://th' },
    ];

    const message = formatPublishResults(results);

    expect(message).toContain('⚠️ 部分發布失敗');
    expect(message).toContain('❌');
    expect(message).toContain('✅');
  });

  it('formats all failure message', () => {
    const results: PublishResult[] = [
      { platform: 'instagram', success: false, error: 'a' },
      { platform: 'facebook', success: false, error: 'b' },
      { platform: 'threads', success: false, error: 'c' },
    ];

    expect(formatPublishResults(results)).toBe('❌ 發布失敗，請稍後再試');
  });
});
