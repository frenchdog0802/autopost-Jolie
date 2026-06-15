import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../helpers/createTestApp.js';
import { signLineWebhook } from '../helpers/lineSignature.js';

describe('webhook integration', () => {
  it('GET /health returns ok', async () => {
    const app = createTestApp();
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('POST /webhook without signature returns 401', async () => {
    const app = createTestApp();
    const response = await request(app)
      .post('/webhook')
      .set('Content-Type', 'application/json')
      .send({ events: [] });

    expect(response.status).toBe(401);
  });

  it('POST /webhook with invalid signature returns 401', async () => {
    const app = createTestApp();
    const body = JSON.stringify({ events: [] });
    const response = await request(app)
      .post('/webhook')
      .set('Content-Type', 'application/json')
      .set('x-line-signature', 'invalid')
      .send(body);

    expect(response.status).toBe(401);
  });

  it('POST /webhook with valid signature returns 200', async () => {
    const app = createTestApp();
    const body = JSON.stringify({
      events: [
        {
          type: 'message',
          source: { userId: 'U123' },
          message: { type: 'text' },
        },
      ],
    });
    const signature = signLineWebhook(body, 'line-secret');

    const response = await request(app)
      .post('/webhook')
      .set('Content-Type', 'application/json')
      .set('x-line-signature', signature)
      .send(body);

    expect(response.status).toBe(200);
  });
});
