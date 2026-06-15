import { describe, expect, it } from 'vitest';
import { bootstrap } from '../bootstrap.js';
import { loadRuntimeConfig } from '../config/index.js';
import { VALID_TEST_ENV } from './helpers/testEnv.js';

describe('bootstrap', () => {
  it('returns app and services with expected keys', () => {
    const config = loadRuntimeConfig({ ...VALID_TEST_ENV, NODE_ENV: 'test' });
    const result = bootstrap({ config });

    expect(result.app).toBeDefined();
    expect(result.services).toMatchObject({
      s3Service: expect.any(Object),
      aiService: expect.any(Object),
      lineService: expect.any(Object),
      sessionStore: expect.any(Object),
      publisherRegistry: expect.any(Object),
      lineHandler: expect.any(Object),
    });
  });
});
