import type { Readable } from 'node:stream';

import { Client } from 'minio';

export type StoredObject = {
  bucket: string;
  objectKey: string;
  size: number;
  mimeType: string;
  url: string;
};

export type StoredObjectStat = {
  size: number;
  mimeType: string;
};

export interface ContentObjectStorage {
  ready(): Promise<boolean>;
  put(input: { objectKey: string; bytes: Buffer; mimeType: string }): Promise<StoredObject>;
  remove(bucket: string, objectKey: string): Promise<void>;
  stat(objectKey: string): Promise<StoredObjectStat>;
  stream(objectKey: string, offset: number, length: number): Promise<Readable>;
}

export class MinioContentObjectStorage implements ContentObjectStorage {
  private readonly client: Client;
  private readonly bucket: string;
  private ensureBucketPromise: Promise<void> | undefined;

  constructor(environment: NodeJS.ProcessEnv = process.env) {
    const endPoint = environment.MINIO_ENDPOINT?.trim() || '127.0.0.1';
    const port = Number(environment.MINIO_PORT ?? 9000);
    const useSSL = environment.MINIO_USE_SSL === 'true';
    const accessKey = environment.MINIO_ROOT_USER?.trim() || '';
    const secretKey = environment.MINIO_ROOT_PASSWORD?.trim() || '';
    if (!accessKey || !secretKey) throw new Error('MinIO credentials are required');
    if (!Number.isInteger(port) || port < 1 || port > 65_535) throw new Error('MINIO_PORT is invalid');
    this.bucket = environment.MINIO_BUCKET?.trim() || 'videoplayer-content';
    this.client = new Client({ endPoint, port, useSSL, accessKey, secretKey });
  }

  private ensureBucket() {
    this.ensureBucketPromise ??= (async () => {
      const exists = await this.client.bucketExists(this.bucket).catch(() => false);
      if (!exists) await this.client.makeBucket(this.bucket, 'us-east-1');
    })();
    return this.ensureBucketPromise;
  }

  async ready() {
    try {
      await this.ensureBucket();
      return true;
    } catch {
      this.ensureBucketPromise = undefined;
      return false;
    }
  }

  async put(input: { objectKey: string; bytes: Buffer; mimeType: string }) {
    await this.ensureBucket();
    await this.client.putObject(this.bucket, input.objectKey, input.bytes, input.bytes.length, { 'Content-Type': input.mimeType });
    return {
      bucket: this.bucket,
      objectKey: input.objectKey,
      size: input.bytes.length,
      mimeType: input.mimeType,
      url: `/api/v1/media/objects/${encodeURIComponent(input.objectKey)}`,
    };
  }

  remove(bucket: string, objectKey: string) {
    return this.client.removeObject(bucket, objectKey);
  }

  async stat(objectKey: string) {
    await this.ensureBucket();
    const stat = await this.client.statObject(this.bucket, objectKey);
    const metadata = stat.metaData as Record<string, unknown>;
    const mimeType = String(metadata['content-type'] ?? metadata['Content-Type'] ?? 'application/octet-stream');
    return { size: stat.size, mimeType };
  }

  async stream(objectKey: string, offset: number, length: number) {
    await this.ensureBucket();
    return this.client.getPartialObject(this.bucket, objectKey, offset, length);
  }
}
