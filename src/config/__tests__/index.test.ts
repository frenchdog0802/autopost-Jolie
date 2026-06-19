import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConfigError } from '../../types/errors.js';
import { loadConfig, REQUIRED_ENV_VARS } from '../index.js';

const VALID_ENV: Record<string, string> = {
  LINE_CHANNEL_ACCESS_TOKEN: 'line-token',
  LINE_CHANNEL_SECRET: 'line-secret',
  OPENAI_API_KEY: 'openai-key',
  AWS_ACCESS_KEY_ID: 'aws-key',
  AWS_SECRET_ACCESS_KEY: 'aws-secret',
  AWS_REGION: 'ap-northeast-1',
  S3_BUCKET_NAME: 'my-bucket',
  META_USER_ACCESS_TOKEN: 'meta-token',
  INSTAGRAM_BUSINESS_ACCOUNT_ID: 'ig-id',
  FACEBOOK_PAGE_ID: 'fb-page',
  THREADS_USER_ID: 'threads-user',
  THREADS_ACCESS_TOKEN: 'threads-token',
};

describe('loadConfig', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('parses config when all required variables are present', () => {
    const config = loadConfig(VALID_ENV);

    for (const key of REQUIRED_ENV_VARS) {
      expect(config[key]).toBe(VALID_ENV[key]);
    }
  });

  it('throws ConfigError when OPENAI_API_KEY is missing', () => {
    const env = { ...VALID_ENV };
    delete env.OPENAI_API_KEY;

    expect(() => loadConfig(env)).toThrow(ConfigError);
    expect(() => loadConfig(env)).toThrow(/OPENAI_API_KEY/);
  });

  it('throws ConfigError listing all missing keys', () => {
    const env = { ...VALID_ENV };
    delete env.OPENAI_API_KEY;
    delete env.S3_BUCKET_NAME;

    expect(() => loadConfig(env)).toThrow(ConfigError);
    expect(() => loadConfig(env)).toThrow(/OPENAI_API_KEY/);
    expect(() => loadConfig(env)).toThrow(/S3_BUCKET_NAME/);
  });

  it('treats empty string values as missing', () => {
    const env = { ...VALID_ENV, AWS_REGION: '   ' };

    expect(() => loadConfig(env)).toThrow(ConfigError);
    expect(() => loadConfig(env)).toThrow(/AWS_REGION/);
  });
});
