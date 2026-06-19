import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  graphApiServer,
  http,
  HttpResponse,
  resetMswHandlers,
  startMswServer,
  stopMswServer,
} from '../../__tests__/helpers/mswServer.js';
import { InstagramPublisher } from '../instagramPublisher.js';

const config = {
  INSTAGRAM_BUSINESS_ACCOUNT_ID: 'ig-id',
  META_USER_ACCESS_TOKEN: 'token',
};

describe('InstagramPublisher', () => {
  beforeAll(() => startMswServer());
  afterAll(() => stopMswServer());
  afterEach(() => resetMswHandlers());

  it('publishes through media creation and publish steps', async () => {
    graphApiServer.use(
      http.post('https://graph.facebook.com/v21.0/ig-id/media', () =>
        HttpResponse.json({ id: 'creation-1' }),
      ),
      http.get('https://graph.facebook.com/v21.0/creation-1', () =>
        HttpResponse.json({ status_code: 'FINISHED' }),
      ),
      http.post('https://graph.facebook.com/v21.0/ig-id/media_publish', () =>
        HttpResponse.json({ id: 'media-1' }),
      ),
      http.get('https://graph.facebook.com/v21.0/media-1', () =>
        HttpResponse.json({ permalink: 'https://instagram.com/p/1' }),
      ),
    );

    const publisher = new InstagramPublisher(config);
    const result = await publisher.publish('https://img', 'cap', '#tag');

    expect(result).toEqual({
      platform: 'instagram',
      success: true,
      postUrl: 'https://instagram.com/p/1',
    });
  });

  it('returns failure when first step fails', async () => {
    graphApiServer.use(
      http.post('https://graph.facebook.com/v21.0/ig-id/media', () =>
        HttpResponse.json(
          { error: { message: 'bad request' } },
          { status: 400 },
        ),
      ),
    );

    const publisher = new InstagramPublisher(config);
    const result = await publisher.publish('https://img', 'cap', '#tag');

    expect(result.success).toBe(false);
    expect(result.platform).toBe('instagram');
  });

  it('returns token expiry hint for OAuth errors', async () => {
    graphApiServer.use(
      http.post('https://graph.facebook.com/v21.0/ig-id/media', () =>
        HttpResponse.json(
          { error: { message: 'expired', code: 190 } },
          { status: 400 },
        ),
      ),
    );

    const publisher = new InstagramPublisher(config);
    const result = await publisher.publish('https://img', 'cap', '#tag');

    expect(result.success).toBe(false);
    expect(result.error).toContain('token 可能已過期');
  });
});
