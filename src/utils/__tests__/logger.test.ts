import { Writable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { createAppLogger, createChildLogger, logger } from '../logger.js';

describe('logger', () => {
  it('logger.info does not throw', () => {
    expect(() => {
      logger.info('test message');
    }).not.toThrow();
  });

  it('child logger includes bindings in JSON output', () => {
    const chunks: string[] = [];
    const stream = new Writable({
      write(chunk, _encoding, callback) {
        chunks.push(String(chunk));
        callback();
      },
    });

    const root = createAppLogger(stream);
    const child = createChildLogger(
      { userId: 'U123', platform: 'instagram' },
      root,
    );

    child.info('publish started');

    expect(chunks.length).toBeGreaterThan(0);
    const parsed = JSON.parse(chunks[0]!.trim()) as {
      userId: string;
      platform: string;
      msg: string;
    };

    expect(parsed.userId).toBe('U123');
    expect(parsed.platform).toBe('instagram');
    expect(parsed.msg).toBe('publish started');
  });
});
