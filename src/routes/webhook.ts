import { Router, type Request, type Response } from 'express';
import type { LineHandler, LineWebhookEvent } from '../handlers/lineHandler.js';
import { createLineSignatureMiddleware } from '../middleware/lineSignature.js';
import { logger } from '../utils/logger.js';

interface WebhookRequestBody {
  events?: unknown[];
}

/**
 * Create webhook routes with LINE signature validation and async dispatch.
 */
export function createWebhookRouter(
  lineHandler: LineHandler,
  channelSecret: string,
): Router {
  const router = Router();

  router.post(
    '/',
    createLineSignatureMiddleware(channelSecret),
    (req: Request, res: Response) => {
      res.sendStatus(200);

      const body = parseWebhookBody(req.body);
      const events = (body.events ?? []) as LineWebhookEvent[];

      setImmediate(() => {
        lineHandler.handleEvents(events).catch((error) => {
          logger.error({ err: error }, 'Webhook event handling failed');
        });
      });
    },
  );

  return router;
}

/**
 * Health check route for Render and load balancers.
 */
export function createHealthRouter(): Router {
  const router = Router();

  router.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  return router;
}

function parseWebhookBody(body: unknown): WebhookRequestBody {
  if (Buffer.isBuffer(body)) {
    return JSON.parse(body.toString('utf8')) as WebhookRequestBody;
  }

  if (typeof body === 'object' && body !== null) {
    return body as WebhookRequestBody;
  }

  return {};
}
