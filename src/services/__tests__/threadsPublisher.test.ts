import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  graphApiServer,
  http,
  HttpResponse,
  resetMswHandlers,
  startMswServer,
  stopMswServer,
} from '../../__tests__/helpers/mswServer.js';
import { ThreadsPublisher } from '../threadsPublisher.js';

const config = {
  THREADS_USER_ID: 'threads-id',
  THREADS_ACCESS_TOKEN: 'token',
};

describe('ThreadsPublisher', () => {
  beforeAll(() => startMswServer());
  afterAll(() => stopMswServer());
  afterEach(() => resetMswHandlers());

  it('publishes through container and publish steps', async () => {
    graphApiServer.use(
      http.post('https://graph.facebook.com/v21.0/threads-id/threads', () =>
        HttpResponse.json({ id: 'creation-1' }),
      ),
      http.post(
        'https://graph.facebook.com/v21.0/threads-id/threads_publish',
        () => HttpResponse.json({ id: 'media-1' }),
      ),
      http.get('https://graph.facebook.com/v21.0/media-1', () =>
        HttpResponse.json({ permalink: 'https://threads.net/t/1' }),
      ),
    );

    const publisher = new ThreadsPublisher(config);
    const result = await publisher.publish('https://img', 'cap', '#tag');

    expect(result.success).toBe(true);
    expect(result.postUrl).toBe('https://threads.net/t/1');
  });

  it('returns failure when first step fails', async () => {
    graphApiServer.use(
      http.post('https://graph.facebook.com/v21.0/threads-id/threads', () =>
        HttpResponse.json({ error: { message: 'fail' } }, { status: 400 }),
      ),
    );

    const publisher = new ThreadsPublisher(config);
    const result = await publisher.publish('https://img', 'cap', '#tag');

    expect(result.success).toBe(false);
  });

  it('returns token expiry hint for OAuth errors', async () => {
    graphApiServer.use(
      http.post('https://graph.facebook.com/v21.0/threads-id/threads', () =>
        HttpResponse.json(
          { error: { message: 'expired', code: 190 } },
          { status: 400 },
        ),
      ),
    );

    const publisher = new ThreadsPublisher(config);
    const result = await publisher.publish('https://img', 'cap', '#tag');

    expect(result.error).toContain('token 可能已過期');
  });
});
