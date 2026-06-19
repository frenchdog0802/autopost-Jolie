import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { validateSignature } from '@line/bot-sdk';
import { SignatureError } from '../../types/errors.js';
import { validateLineSignature } from '../auth.js';

function sign(body: Buffer, secret: string): string {
  return createHmac('sha256', secret).update(body).digest('base64');
}

describe('auth utils', () => {
  it('accepts a valid signature', () => {
    const secret = 'secret';
    const body = Buffer.from('{"events":[]}');

    expect(() =>
      validateLineSignature(body, sign(body, secret), secret),
    ).not.toThrow();
  });

  it('throws SignatureError when signature is missing', () => {
    expect(() =>
      validateLineSignature(Buffer.from('{}'), undefined, 'secret'),
    ).toThrow(SignatureError);
  });

  it('throws SignatureError when signature is invalid', () => {
    expect(() =>
      validateLineSignature(Buffer.from('{}'), 'bad-signature', 'secret'),
    ).toThrow(SignatureError);
  });

  it('generated signature passes bot-sdk validation', () => {
    const secret = 'channel-secret';
    const body = Buffer.from('payload');
    const signature = sign(body, secret);

    expect(validateSignature(body, secret, signature)).toBe(true);
  });
});
