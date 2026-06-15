import { beforeEach, describe, expect, it } from 'vitest';
import { PutObjectCommand, DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';
import { S3Service } from '../s3Service.js';
import { S3UploadError } from '../../types/errors.js';

const s3Mock = mockClient(S3Client);

const config = {
  AWS_ACCESS_KEY_ID: 'key',
  AWS_SECRET_ACCESS_KEY: 'secret',
  AWS_REGION: 'ap-northeast-1',
  S3_BUCKET_NAME: 'bucket',
};

describe('S3Service', () => {
  beforeEach(() => {
    s3Mock.reset();
  });

  it('uploads image and returns key and public url', async () => {
    s3Mock.on(PutObjectCommand).resolves({});

    const service = new S3Service({ config });
    const result = await service.upload(Buffer.from('image'), 'image/jpeg');

    expect(result.key).toMatch(/^uploads\/.+\.jpg$/);
    expect(result.url).toContain('bucket.s3.ap-northeast-1.amazonaws.com');
  });

  it('throws S3UploadError when upload fails', async () => {
    s3Mock.on(PutObjectCommand).rejects(new Error('network'));

    const service = new S3Service({ config });

    await expect(
      service.upload(Buffer.from('image'), 'image/jpeg'),
    ).rejects.toBeInstanceOf(S3UploadError);
  });

  it('deletes object by key', async () => {
    s3Mock.on(DeleteObjectCommand).resolves({});

    const service = new S3Service({ config });
    await expect(service.delete('uploads/test.jpg')).resolves.toBeUndefined();
  });

  it('rethrows delete errors', async () => {
    s3Mock.on(DeleteObjectCommand).rejects(new Error('delete failed'));

    const service = new S3Service({ config });
    await expect(service.delete('uploads/test.jpg')).rejects.toThrow(
      'delete failed',
    );
  });
});
