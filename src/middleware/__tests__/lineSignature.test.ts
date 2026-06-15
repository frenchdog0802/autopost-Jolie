import { describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import { createLineSignatureMiddleware } from '../lineSignature.js';
import { signLineWebhook } from '../../__tests__/helpers/lineSignature.js';

function createMockResponse() {
  const res = {
    statusCode: 200,
    sendStatus(code: number) {
      this.statusCode = code;
      return this;
    },
  } as Response;

  return res;
}

describe('createLineSignatureMiddleware', () => {
  it('returns 401 when signature is missing', () => {
    const middleware = createLineSignatureMiddleware('secret');
    const req = {
      header: () => undefined,
      body: Buffer.from('{}'),
    } as unknown as Request;
    const res = createMockResponse();
    const next = vi.fn();

    middleware(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when signature is invalid', () => {
    const middleware = createLineSignatureMiddleware('secret');
    const req = {
      header: () => 'invalid',
      body: Buffer.from('{}'),
    } as unknown as Request;
    const res = createMockResponse();
    const next = vi.fn();

    middleware(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next when signature is valid', () => {
    const secret = 'secret';
    const body = Buffer.from('{"events":[]}');
    const middleware = createLineSignatureMiddleware(secret);
    const req = {
      header: () => signLineWebhook(body, secret),
      body,
    } as unknown as Request;
    const res = createMockResponse();
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });
});
