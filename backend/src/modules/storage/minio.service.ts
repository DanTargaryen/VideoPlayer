import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'minio';
import * as fs from 'node:fs';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import * as path from 'node:path';

export const LOCAL_STORAGE_ROOT = path.join(process.cwd(), 'storage');

export function getStorageMode(): 'minio' | 'local' {
  return (process.env.STORAGE_BACKEND || 'minio') as 'minio' | 'local';
}

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private storageMode: 'minio' | 'local';
  private readonly bucket: string;
  private readonly publicBaseUrl: string;
  private readonly client: Client | null;

  constructor(private readonly configService: ConfigService) {
    this.storageMode = getStorageMode();
    const endPoint = this.configService.get<string>('MINIO_ENDPOINT', '127.0.0.1') ?? '127.0.0.1';
    const port = Number(this.configService.get<string>('MINIO_PORT', '9000'));
    const useSSL = this.configService.get<string>('MINIO_USE_SSL', 'false') === 'true';
    const accessKey = this.configService.get<string>('MINIO_ROOT_USER', 'minioadmin') ?? 'minioadmin';
    const secretKey = this.configService.get<string>('MINIO_ROOT_PASSWORD', 'minioadmin') ?? 'minioadmin';

    this.bucket = this.configService.get<string>('MINIO_BUCKET', 'video-player') ?? 'video-player';
    this.publicBaseUrl =
      this.configService.get<string>('MINIO_PUBLIC_BASE_URL') ??
      `${useSSL ? 'https' : 'http'}://${endPoint}:${port}`;

    this.client =
      this.storageMode === 'minio'
        ? new Client({
            endPoint,
            port,
            useSSL,
            accessKey,
            secretKey,
          })
        : null;
  }

  async onModuleInit() {
    if (this.storageMode === 'local') {
      this.ensureLocalStorageRoot();
      return;
    }

    if (!this.client) {
      return;
    }

    try {
      const exists = await this.client.bucketExists(this.bucket).catch(() => false);

      if (!exists) {
        await this.client.makeBucket(this.bucket, 'us-east-1');
        await this.client.setBucketPolicy(
          this.bucket,
          JSON.stringify({
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Principal: { AWS: ['*'] },
                Action: ['s3:GetObject'],
                Resource: [`arn:aws:s3:::${this.bucket}/*`],
              },
            ],
          }),
        );
        this.logger.log(`Created bucket ${this.bucket}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`MinIO unavailable, fallback to local storage: ${message}`);
      this.storageMode = 'local';
      this.ensureLocalStorageRoot();
    }
  }

  private ensureLocalStorageRoot() {
    if (!fs.existsSync(LOCAL_STORAGE_ROOT)) {
      fs.mkdirSync(LOCAL_STORAGE_ROOT, { recursive: true });
    }
  }

  async uploadFile(bucketName: string, objectName: string, filePath: string, contentType: string) {
    if (this.storageMode === 'minio' && this.client) {
      await this.client.fPutObject(bucketName, objectName, filePath, {
        'Content-Type': contentType,
      });
      return `${this.publicBaseUrl}/${bucketName}/${objectName}`;
    }

    const destPath = path.join(LOCAL_STORAGE_ROOT, objectName);
    const destDir = path.dirname(destPath);

    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    fs.copyFileSync(filePath, destPath);
    return `/storage/${objectName}`;
  }

  async uploadObject(input: {
    objectKey: string;
    buffer: Buffer;
    size: number;
    mimeType: string;
    originalName?: string;
  }) {
    if (this.storageMode === 'minio' && this.client) {
      await this.client.putObject(this.bucket, input.objectKey, input.buffer, input.size, {
        'Content-Type': input.mimeType,
        'X-Amz-Meta-Original-Name': input.originalName ?? '',
      });

      return {
        bucket: this.bucket,
        objectKey: input.objectKey,
        url: `${this.publicBaseUrl}/${this.bucket}/${input.objectKey}`,
      };
    }

    const destPath = path.join(LOCAL_STORAGE_ROOT, input.objectKey);
    const destDir = path.dirname(destPath);

    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    fs.writeFileSync(destPath, input.buffer);
    return {
      bucket: this.bucket,
      objectKey: input.objectKey,
      url: `/storage/${input.objectKey}`,
    };
  }

  async uploadFileFromPath(input: {
    objectKey: string;
    filePath: string;
    mimeType: string;
    originalName?: string;
  }) {
    const fileStat = await stat(input.filePath);

    if (this.storageMode === 'minio' && this.client) {
      await this.client.putObject(
        this.bucket,
        input.objectKey,
        createReadStream(input.filePath),
        fileStat.size,
        {
          'Content-Type': input.mimeType,
          'X-Amz-Meta-Original-Name': input.originalName ?? '',
        },
      );

      return {
        bucket: this.bucket,
        objectKey: input.objectKey,
        url: `${this.publicBaseUrl}/${this.bucket}/${input.objectKey}`,
        size: fileStat.size,
      };
    }

    const destPath = path.join(LOCAL_STORAGE_ROOT, input.objectKey);
    const destDir = path.dirname(destPath);

    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    fs.copyFileSync(input.filePath, destPath);
    return {
      bucket: this.bucket,
      objectKey: input.objectKey,
      url: `/storage/${input.objectKey}`,
      size: fileStat.size,
    };
  }

  async downloadObjectToFile(objectKey: string, targetPath: string) {
    if (this.storageMode === 'minio' && this.client) {
      await this.client.fGetObject(this.bucket, objectKey, targetPath);
      return targetPath;
    }

    const sourcePath = path.join(LOCAL_STORAGE_ROOT, objectKey);
    const destDir = path.dirname(targetPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    fs.copyFileSync(sourcePath, targetPath);
    return targetPath;
  }

  async deleteFile(bucketName: string, objectName: string) {
    if (this.storageMode === 'minio' && this.client) {
      await this.client.removeObject(bucketName, objectName);
      return;
    }

    const filePath = path.join(LOCAL_STORAGE_ROOT, objectName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  getStorageMode(): 'minio' | 'local' {
    return this.storageMode;
  }
}
