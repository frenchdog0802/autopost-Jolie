import { describe, expect, it } from 'vitest';
import { validateSignature } from '@line/bot-sdk';
import { signLineWebhook } from './lineSignature.js';

describe('signLineWebhook', () => {
  it('produces a signature that passes LINE validation', () => {
    const secret = 'test-secret';
    const body = JSON.stringify({ events: [] });
    const signature = signLineWebhook(body, secret);

    expect(validateSignature(Buffer.from(body), secret, signature)).toBe(true);
  });
});
