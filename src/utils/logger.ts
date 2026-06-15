import pino, { type DestinationStream, type Logger, type LoggerOptions } from 'pino';

const LOG_LEVEL = process.env.LOG_LEVEL?.trim() || 'info';

const loggerOptions: LoggerOptions = {
  level: LOG_LEVEL,
};

/**
 * Create a pino logger instance, optionally writing to a custom destination.
 */
export function createAppLogger(destination?: DestinationStream): Logger {
  return destination ? pino(loggerOptions, destination) : pino(loggerOptions);
}

/** Default structured JSON logger writing to stdout. */
export const logger: Logger = createAppLogger();

/**
 * Create a child logger with module-specific context bindings.
 */
export function createChildLogger(
  bindings: Record<string, string>,
  parent: Logger = logger,
): Logger {
  return parent.child(bindings);
}

/**
 * Create a logger with a specific log level (used when config is available).
 */
export function createLoggerWithLevel(
  level: string,
  destination?: DestinationStream,
): Logger {
  return destination
    ? pino({ level }, destination)
    : pino({ level });
}
