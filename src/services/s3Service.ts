import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';
import type { RuntimeConfig } from '../config/index.js';
import type { IS3Service } from '../types/index.js';
import { S3UploadError } from '../types/errors.js';
import { createChildLogger } from '../utils/logger.js';

const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

function getExtension(mimeType: string): string {
  return MIME_EXTENSIONS[mimeType] ?? 'jpg';
}

function buildPublicUrl(
  bucket: string,
  region: string,
  key: string,
): string {
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

export interface S3ServiceDeps {
  config: Pick<
    RuntimeConfig,
    'AWS_ACCESS_KEY_ID' | 'AWS_SECRET_ACCESS_KEY' | 'AWS_REGION' | 'S3_BUCKET_NAME'
  >;
  client?: S3Client;
}

/**
 * AWS S3 image upload and delete service.
 */
export class S3Service implements IS3Service {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly region: string;
  private readonly log = createChildLogger({ service: 's3' });

  constructor(deps: S3ServiceDeps) {
    this.bucket = deps.config.S3_BUCKET_NAME;
    this.region = deps.config.AWS_REGION;
    this.client =
      deps.client ??
      new S3Client({
        region: deps.config.AWS_REGION,
        credentials: {
          accessKeyId: deps.config.AWS_ACCESS_KEY_ID,
          secretAccessKey: deps.config.AWS_SECRET_ACCESS_KEY,
        },
      });
  }

  async upload(
    buffer: Buffer,
    mimeType: string,
  ): Promise<{ key: string; url: string }> {
    const ext = getExtension(mimeType);
    const key = `uploads/${randomUUID()}.${ext}`;

    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: mimeType,
        }),
      );
    } catch (error) {
      this.log.error({ err: error }, 'S3 upload failed');
      throw new S3UploadError('Failed to upload image to S3');
    }

    return {
      key,
      url: buildPublicUrl(this.bucket, this.region, key),
    };
  }

  async delete(key: string): Promise<void> {
    if (!key) {
      return;
    }

    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
    } catch (error) {
      this.log.error({ err: error, key }, 'S3 delete failed');
      throw error;
    }
  }
}
