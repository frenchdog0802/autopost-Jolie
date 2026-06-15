import type { Express } from 'express';
import { bootstrap, type BootstrapOptions } from '../../bootstrap.js';
import { loadRuntimeConfig } from '../../config/index.js';
import { VALID_TEST_ENV } from './testEnv.js';

/**
 * Create an Express app wired for integration tests with optional service mocks.
 */
export function createTestApp(options: BootstrapOptions = {}): Express {
  const config =
    options.config ??
    loadRuntimeConfig({
      ...VALID_TEST_ENV,
      NODE_ENV: 'test',
    });

  return bootstrap({ ...options, config }).app;
}

export { VALID_TEST_ENV };
