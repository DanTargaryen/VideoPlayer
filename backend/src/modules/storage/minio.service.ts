import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'minio';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private readonly client: Client;
  private readonly bucket: string;
  private readonly publicBaseUrl: string;

  constructor(private readonly configService: ConfigService) {
    const endPoint = this.configService.get<string>('MINIO_ENDPOINT', '127.0.0.1') ?? '127.0.0.1';
    const port = Number(this.configService.get<string>('MINIO_PORT', '9000'));
    const useSSL = this.configService.get<string>('MINIO_USE_SSL', 'false') === 'true';
    const accessKey = this.configService.get<string>('MINIO_ROOT_USER', 'minioadmin') ?? 'minioadmin';
    const secretKey = this.configService.get<string>('MINIO_ROOT_PASSWORD', 'minioadmin') ?? 'minioadmin';

    this.bucket = this.configService.get<string>('MINIO_BUCKET', 'video-player') ?? 'video-player';
    this.publicBaseUrl =
      this.configService.get<string>('MINIO_PUBLIC_BASE_URL') ??
      `${useSSL ? 'https' : 'http'}://${endPoint}:${port}`;

    this.client = new Client({
      endPoint,
      port,
      useSSL,
      accessKey,
      secretKey,
    });
  }

  async onModuleInit() {
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
  }

  async uploadObject(input: {
    objectKey: string;
    buffer: Buffer;
    size: number;
    mimeType: string;
    originalName?: string;
  }) {
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

  async uploadFileFromPath(input: {
    objectKey: string;
    filePath: string;
    mimeType: string;
    originalName?: string;
  }) {
    const fileStat = await stat(input.filePath);
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

  async downloadObjectToFile(objectKey: string, targetPath: string) {
    await this.client.fGetObject(this.bucket, objectKey, targetPath);
    return targetPath;
  }
}
