/**
 * Thrown when LINE webhook signature validation fails.
 */
export class SignatureError extends Error {
  constructor(message = 'Invalid LINE webhook signature') {
    super(message);
    this.name = 'SignatureError';
  }
}

/**
 * Thrown when uploading an image to S3 fails.
 */
export class S3UploadError extends Error {
  constructor(message = 'Failed to upload image to S3') {
    super(message);
    this.name = 'S3UploadError';
  }
}

/**
 * Thrown when OpenAI caption generation fails or returns invalid data.
 */
export class AIServiceError extends Error {
  constructor(message = 'AI caption generation failed') {
    super(message);
    this.name = 'AIServiceError';
  }
}

/**
 * Thrown when a Quick Reply action references a missing or expired session.
 */
export class SessionNotFoundError extends Error {
  constructor(message = 'Post session not found or expired') {
    super(message);
    this.name = 'SessionNotFoundError';
  }
}

/**
 * Thrown when required environment variables are missing at startup.
 */
export class ConfigError extends Error {
  constructor(message = 'Missing required environment variable') {
    super(message);
    this.name = 'ConfigError';
  }
}
