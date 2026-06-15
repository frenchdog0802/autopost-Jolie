import { createHmac } from 'node:crypto';

/**
 * Generate a valid LINE webhook signature for test payloads.
 */
export function signLineWebhook(body: string | Buffer, secret: string): string {
  const payload = Buffer.isBuffer(body) ? body : Buffer.from(body);
  return createHmac('sha256', secret).update(payload).digest('base64');
}
