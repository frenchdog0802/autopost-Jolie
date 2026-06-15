import type { RequestHandler } from 'express';
import { SignatureError } from '../types/errors.js';
import { validateLineSignature } from '../utils/auth.js';

/**
 * Express middleware that validates LINE webhook signatures on raw bodies.
 */
export function createLineSignatureMiddleware(
  channelSecret: string,
): RequestHandler {
  return (req, res, next) => {
    try {
      const signature = req.header('x-line-signature');
      const rawBody = Buffer.isBuffer(req.body)
        ? req.body
        : Buffer.from(JSON.stringify(req.body ?? {}));

      validateLineSignature(rawBody, signature, channelSecret);
      next();
    } catch (error) {
      if (error instanceof SignatureError) {
        res.sendStatus(401);
        return;
      }

      next(error);
    }
  };
}
