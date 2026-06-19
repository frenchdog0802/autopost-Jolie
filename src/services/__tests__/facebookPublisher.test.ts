import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  graphApiServer,
  http,
  HttpResponse,
  resetMswHandlers,
  startMswServer,
  stopMswServer,
} from '../../__tests__/helpers/mswServer.js';
import { FacebookPublisher } from '../facebookPublisher.js';

const config = {
  FACEBOOK_PAGE_ID: 'page-id',
  META_USER_ACCESS_TOKEN: 'token',
};

describe('FacebookPublisher', () => {
  beforeAll(() => startMswServer());
  afterAll(() => stopMswServer());
  afterEach(() => resetMswHandlers());

  it('publishes photo to page', async () => {
    graphApiServer.use(
      http.get('https://graph.facebook.com/v21.0/page-id', () =>
        HttpResponse.json({ access_token: 'page-token' }),
      ),
      http.post('https://graph.facebook.com/v21.0/page-id/photos', () =>
        HttpResponse.json({ post_id: '123_456' }),
      ),
    );

    const publisher = new FacebookPublisher(config);
    const result = await publisher.publish('https://img', 'cap', '#tag');

    expect(result.success).toBe(true);
    expect(result.postUrl).toContain('123_456');
  });

  it('returns failure on server error', async () => {
    graphApiServer.use(
      http.get('https://graph.facebook.com/v21.0/page-id', () =>
        HttpResponse.json({ access_token: 'page-token' }),
      ),
      http.post('https://graph.facebook.com/v21.0/page-id/photos', () =>
        HttpResponse.json({ error: { message: 'fail' } }, { status: 500 }),
      ),
    );

    const publisher = new FacebookPublisher(config);
    const result = await publisher.publish('https://img', 'cap', '#tag');

    expect(result.success).toBe(false);
  });

  it('returns token expiry hint for OAuth errors', async () => {
    graphApiServer.use(
      http.get('https://graph.facebook.com/v21.0/page-id', () =>
        HttpResponse.json({ access_token: 'page-token' }),
      ),
      http.post('https://graph.facebook.com/v21.0/page-id/photos', () =>
        HttpResponse.json(
          { error: { message: 'expired', code: 190 } },
          { status: 400 },
        ),
      ),
    );

    const publisher = new FacebookPublisher(config);
    const result = await publisher.publish('https://img', 'cap', '#tag');

    expect(result.error).toContain('token 可能已過期');
  });
});
