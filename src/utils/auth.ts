import { validateSignature } from '@line/bot-sdk';
import { SignatureError } from '../types/errors.js';

/**
 * Validate a LINE webhook signature against the raw request body.
 */
export function validateLineSignature(
  rawBody: Buffer,
  signature: string | undefined,
  channelSecret: string,
): void {
  if (!signature) {
    throw new SignatureError('Missing LINE webhook signature');
  }

  if (!validateSignature(rawBody, channelSecret, signature)) {
    throw new SignatureError('Invalid LINE webhook signature');
  }
}

/**
 * Check whether a LINE user ID is on the allow list.
 */
export function isAllowedUser(userId: string, allowedUserId: string): boolean {
  return userId === allowedUserId;
}
