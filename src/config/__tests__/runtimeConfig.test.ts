import { afterEach, describe, expect, it } from 'vitest';
import { loadRuntimeConfig } from '../index.js';
import { VALID_TEST_ENV } from '../../__tests__/helpers/testEnv.js';

describe('loadRuntimeConfig optional settings', () => {
  afterEach(() => {
    delete process.env.SESSION_TTL_MS;
    delete process.env.LOG_LEVEL;
    delete process.env.PORT;
  });

  it('uses defaults when optional variables are missing', () => {
    const config = loadRuntimeConfig({ ...VALID_TEST_ENV, NODE_ENV: 'test' });

    expect(config.SESSION_TTL_MS).toBe(600_000);
    expect(config.LOG_LEVEL).toBe('info');
    expect(config.PORT).toBe(3000);
  });

  it('parses SESSION_TTL_MS override as number', () => {
    const config = loadRuntimeConfig({
      ...VALID_TEST_ENV,
      SESSION_TTL_MS: '300000',
      NODE_ENV: 'test',
    });

    expect(config.SESSION_TTL_MS).toBe(300_000);
  });
});
