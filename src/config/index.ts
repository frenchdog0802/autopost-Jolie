import dotenv from 'dotenv';
import { ConfigError } from '../types/errors.js';

/** Environment variables required at startup. */
export const REQUIRED_ENV_VARS = [
  'LINE_CHANNEL_ACCESS_TOKEN',
  'LINE_CHANNEL_SECRET',
  'OPENAI_API_KEY',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_REGION',
  'S3_BUCKET_NAME',
  'META_USER_ACCESS_TOKEN',
  'INSTAGRAM_BUSINESS_ACCOUNT_ID',
  'FACEBOOK_PAGE_ID',
  'THREADS_USER_ID',
  'THREADS_ACCESS_TOKEN',
] as const;

export type RequiredEnvVar = (typeof REQUIRED_ENV_VARS)[number];

/** Validated application configuration from environment variables. */
export type AppConfig = Record<RequiredEnvVar, string>;

/** Runtime configuration including optional settings with defaults. */
export interface RuntimeConfig extends AppConfig {
  SESSION_TTL_MS: number;
  LOG_LEVEL: string;
  PORT: number;
}

const DEFAULT_SESSION_TTL_MS = 600_000;
const DEFAULT_LOG_LEVEL = 'info';
const DEFAULT_PORT = 3000;

let dotenvLoaded = false;

function ensureDotenvLoaded(): void {
  if (dotenvLoaded || process.env.NODE_ENV === 'production') {
    return;
  }

  dotenv.config({ quiet: true });
  dotenvLoaded = true;
}

function getMissingEnvVars(env: NodeJS.ProcessEnv): RequiredEnvVar[] {
  return REQUIRED_ENV_VARS.filter((key) => {
    const value = env[key];
    return value === undefined || value.trim() === '';
  });
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === '') {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return fallback;
  }

  return parsed;
}

/**
 * Load and validate required environment variables.
 * Missing keys throw ConfigError with the list of absent variables.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  if (env === process.env) {
    ensureDotenvLoaded();
  }

  const missing = getMissingEnvVars(env);
  if (missing.length > 0) {
    throw new ConfigError(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
  }

  return REQUIRED_ENV_VARS.reduce<AppConfig>((config, key) => {
    config[key] = env[key]!.trim();
    return config;
  }, {} as AppConfig);
}

/**
 * Load required env vars plus optional settings with defaults.
 */
export function loadRuntimeConfig(
  env: NodeJS.ProcessEnv = process.env,
): RuntimeConfig {
  const base = loadConfig(env);

  return {
    ...base,
    SESSION_TTL_MS: parsePositiveInt(
      env.SESSION_TTL_MS,
      DEFAULT_SESSION_TTL_MS,
    ),
    LOG_LEVEL: env.LOG_LEVEL?.trim() || DEFAULT_LOG_LEVEL,
    PORT: parsePositiveInt(env.PORT, DEFAULT_PORT),
  };
}

let cachedConfig: AppConfig | undefined;
let cachedRuntimeConfig: RuntimeConfig | undefined;

/** Return validated config, loading and caching on first access. */
export function getConfig(): AppConfig {
  cachedConfig ??= loadConfig();
  return cachedConfig;
}

/** Return runtime config with optional defaults, loading on first access. */
export function getRuntimeConfig(): RuntimeConfig {
  cachedRuntimeConfig ??= loadRuntimeConfig();
  return cachedRuntimeConfig;
}

/** Validated config object; loads environment variables on first property access. */
export const config: AppConfig = new Proxy({} as AppConfig, {
  get(_target, prop: string | symbol) {
    if (typeof prop !== 'string') {
      return undefined;
    }

    return getConfig()[prop as RequiredEnvVar];
  },
});

/** Runtime config proxy with optional settings. */
export const runtimeConfig: RuntimeConfig = new Proxy({} as RuntimeConfig, {
  get(_target, prop: string | symbol) {
    if (typeof prop !== 'string') {
      return undefined;
    }

    return getRuntimeConfig()[prop as keyof RuntimeConfig];
  },
});
