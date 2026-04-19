import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import * as path from 'path';
import * as fs from 'fs';

export const LOCAL_STORAGE_ROOT = path.join(process.cwd(), 'storage');

export function getStorageMode(): 'minio' | 'local' {
  return (process.env.STORAGE_BACKEND || 'minio') as 'minio' | 'local';
}

@Injectable()
export class MinioService implements OnModuleInit {
  private minioClient: Minio.Client | null = null;
  private storageMode: 'minio' | 'local';

  constructor(private configService: ConfigService) {
    this.storageMode = getStorageMode();
  }

  onModuleInit() {
    if (this.storageMode === 'minio') {
      this.initializeMinio();
    } else {
      this.initializeLocalStorage();
    }
  }

  private initializeMinio() {
    const endPoint = this.configService.get('MINIO_ENDPOINT') || '127.0.0.1';
    const port = Number(this.configService.get('MINIO_PORT') || 9000);
    const useSSL = this.configService.get('MINIO_USE_SSL') === 'true';
    const accessKey = this.configService.get('MINIO_ROOT_USER') || 'minioadmin';
    const secretKey = this.configService.get('MINIO_ROOT_PASSWORD') || 'minioadmin';

    this.minioClient = new Minio.Client({
      endPoint,
      port,
      useSSL,
      accessKey,
      secretKey,
    });

    this.ensureBucketExists();
  }

  private initializeLocalStorage() {
    if (!fs.existsSync(LOCAL_STORAGE_ROOT)) {
      fs.mkdirSync(LOCAL_STORAGE_ROOT, { recursive: true });
    }
  }

  private async ensureBucketExists() {
    if (!this.minioClient) return;

    const bucketName = this.configService.get('MINIO_BUCKET') || 'video-player';
    const exists = await this.minioClient.bucketExists(bucketName);

    if (!exists) {
      await this.minioClient.makeBucket(bucketName, 'us-east-1');
      await this.minioClient.setBucketPolicy(
        bucketName,
        JSON.stringify({
          Version: '2012-10-17',
          Statement: [
            {
              Action: ['s3:GetObject'],
              Effect: 'Allow',
              Principal: { AWS: ['*'] },
              Resource: [`arn:aws:s3:::${bucketName}/*`],
            },
          ],
        }),
      );
    }
  }

  async uploadFile(
    bucketName: string,
    objectName: string,
    filePath: string,
    contentType: string,
  ): Promise<string> {
    if (this.storageMode === 'minio' && this.minioClient) {
      await this.minioClient.fPutObject(bucketName, objectName, filePath, {
        'Content-Type': contentType,
      });

      const publicBaseUrl = this.configService.get('MINIO_PUBLIC_BASE_URL') || 'http://127.0.0.1:9000';
      return `${publicBaseUrl}/${bucketName}/${objectName}`;
    } else {
      const destPath = path.join(LOCAL_STORAGE_ROOT, objectName);
      const destDir = path.dirname(destPath);

      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }

      fs.copyFileSync(filePath, destPath);
      return `/storage/${objectName}`;
    }
  }

  async uploadObject(params: {
    objectKey: string;
    buffer: Buffer;
    size: number;
    mimeType: string;
    originalName: string;
  }): Promise<{ objectKey: string; bucket: string; url: string }> {
    const bucketName = this.configService.get('MINIO_BUCKET') || 'video-player';
    
    if (this.storageMode === 'minio' && this.minioClient) {
      await this.minioClient.putObject(bucketName, params.objectKey, params.buffer, params.size, {
        'Content-Type': params.mimeType,
      });

      const publicBaseUrl = this.configService.get('MINIO_PUBLIC_BASE_URL') || 'http://127.0.0.1:9000';
      const url = `${publicBaseUrl}/${bucketName}/${params.objectKey}`;
      
      return {
        objectKey: params.objectKey,
        bucket: bucketName,
        url,
      };
    } else {
      const destPath = path.join(LOCAL_STORAGE_ROOT, params.objectKey);
      const destDir = path.dirname(destPath);

      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }

      fs.writeFileSync(destPath, params.buffer);
      const url = `/storage/${params.objectKey}`;
      
      return {
        objectKey: params.objectKey,
        bucket: bucketName,
        url,
      };
    }
  }

  async downloadObjectToFile(objectKey: string, filePath: string): Promise<void> {
    const bucketName = this.configService.get('MINIO_BUCKET') || 'video-player';
    
    if (this.storageMode === 'minio' && this.minioClient) {
      await this.minioClient.fGetObject(bucketName, objectKey, filePath);
    } else {
      const srcPath = path.join(LOCAL_STORAGE_ROOT, objectKey);
      const destDir = path.dirname(filePath);
      
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      
      fs.copyFileSync(srcPath, filePath);
    }
  }

  async uploadFileFromPath(params: {
    objectKey: string;
    filePath: string;
    mimeType: string;
    originalName: string;
  }): Promise<{ objectKey: string; bucket: string; url: string; size: number }> {
    const bucketName = this.configService.get('MINIO_BUCKET') || 'video-player';
    const fileSize = fs.statSync(params.filePath).size;
    
    if (this.storageMode === 'minio' && this.minioClient) {
      await this.minioClient.fPutObject(bucketName, params.objectKey, params.filePath, {
        'Content-Type': params.mimeType,
      });

      const publicBaseUrl = this.configService.get('MINIO_PUBLIC_BASE_URL') || 'http://127.0.0.1:9000';
      const url = `${publicBaseUrl}/${bucketName}/${params.objectKey}`;
      
      return {
        objectKey: params.objectKey,
        bucket: bucketName,
        url,
        size: fileSize,
      };
    } else {
      const destPath = path.join(LOCAL_STORAGE_ROOT, params.objectKey);
      const destDir = path.dirname(destPath);

      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }

      fs.copyFileSync(params.filePath, destPath);
      const url = `/storage/${params.objectKey}`;
      
      return {
        objectKey: params.objectKey,
        bucket: bucketName,
        url,
        size: fileSize,
      };
    }
  }

  async deleteFile(bucketName: string, objectName: string): Promise<void> {
    if (this.storageMode === 'minio' && this.minioClient) {
      await this.minioClient.removeObject(bucketName, objectName);
    } else {
      const filePath = path.join(LOCAL_STORAGE_ROOT, objectName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  }

  getStorageMode(): 'minio' | 'local' {
    return this.storageMode;
  }
}
