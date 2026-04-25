import { Injectable, Logger } from '@nestjs/common';
import { execFile } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { promisify } from 'node:util';

import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../storage/minio.service';

const execFileAsync = promisify(execFile);

const FFMPEG_BIN = process.env.FFMPEG_PATH || 'ffmpeg';
const FFPROBE_BIN = process.env.FFPROBE_PATH || 'ffprobe';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private ffmpegAvailable: boolean | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly minioService: MinioService,
  ) {}

  private async checkFfmpegAvailable(): Promise<boolean> {
    if (this.ffmpegAvailable !== null) {
      return this.ffmpegAvailable;
    }

    try {
      await execFileAsync(FFPROBE_BIN, ['-version']);
      this.ffmpegAvailable = true;
      this.logger.log(`FFmpeg found: ${FFMPEG_BIN}, FFprobe found: ${FFPROBE_BIN}`);
    } catch {
      this.ffmpegAvailable = false;
      this.logger.warn(
        `FFmpeg/FFprobe not found (ffmpeg=${FFMPEG_BIN}, ffprobe=${FFPROBE_BIN}). ` +
          'Video processing (duration probe, cover generation, transcoding) will be skipped. ' +
          'Please install FFmpeg and ensure it is in PATH, or set FFMPEG_PATH / FFPROBE_PATH in .env.',
      );
    }

    return this.ffmpegAvailable;
  }

  async processVideo(videoId: number, originalAssetId: number, existingCoverAssetId?: number | null) {
    const originalAsset = await this.prisma.videoAsset.findUnique({ where: { id: originalAssetId } });

    if (!originalAsset) {
      this.logger.warn(`Original asset ${originalAssetId} not found`);
      return;
    }

    if (!(await this.checkFfmpegAvailable())) {
      this.logger.warn(`Media processing skipped for video ${videoId}: FFmpeg not available`);
      return;
    }

    const workDir = await mkdtemp(path.join(tmpdir(), 'videoplayer-media-'));
    const inputPath = path.join(workDir, 'input');
    const coverPath = path.join(workDir, 'cover.jpg');
    const transcodedPath = path.join(workDir, 'transcoded.mp4');

    try {
      await this.minioService.downloadObjectToFile(originalAsset.objectKey, inputPath);

      const durationSeconds = await this.probeDuration(inputPath);
      const videoUpdate: { durationSeconds?: number; playUrl?: string; coverUrl?: string } = {};
      if (durationSeconds > 0) {
        videoUpdate.durationSeconds = durationSeconds;
      }

      if (!existingCoverAssetId) {
        await this.generateCover(inputPath, coverPath);
        const coverObjectKey = this.buildDerivedObjectKey(originalAsset.objectKey, 'covers', 'jpg');
        const uploadedCover = await this.minioService.uploadFileFromPath({
          objectKey: coverObjectKey,
          filePath: coverPath,
          mimeType: 'image/jpeg',
          originalName: 'cover.jpg',
        });
        await this.prisma.videoAsset.create({
          data: {
            videoId,
            assetType: 'COVER',
            objectKey: uploadedCover.objectKey,
            bucket: uploadedCover.bucket,
            mimeType: 'image/jpeg',
            originalName: 'cover.jpg',
            fileSize: uploadedCover.size,
            url: uploadedCover.url,
          },
        });
        videoUpdate.coverUrl = uploadedCover.url;
      }

      await this.transcodeVideo(inputPath, transcodedPath);
      const transcodedObjectKey = this.buildDerivedObjectKey(originalAsset.objectKey, 'transcoded', 'mp4');
      const uploadedTranscoded = await this.minioService.uploadFileFromPath({
        objectKey: transcodedObjectKey,
        filePath: transcodedPath,
        mimeType: 'video/mp4',
        originalName: 'transcoded.mp4',
      });
      await this.prisma.videoAsset.create({
        data: {
          videoId,
          assetType: 'TRANSCODED',
          objectKey: uploadedTranscoded.objectKey,
          bucket: uploadedTranscoded.bucket,
          mimeType: 'video/mp4',
          originalName: 'transcoded.mp4',
          fileSize: uploadedTranscoded.size,
          url: uploadedTranscoded.url,
        },
      });
      videoUpdate.playUrl = uploadedTranscoded.url;

      await this.prisma.video.update({
        where: { id: videoId },
        data: videoUpdate,
      });
    } catch (error) {
      this.logger.warn(`Media processing skipped for video ${videoId}: ${String(error)}`);
    } finally {
      await rm(workDir, { recursive: true, force: true });
    }
  }

  private async probeDuration(inputPath: string) {
    const { stdout } = await execFileAsync(FFPROBE_BIN, [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'default=noprint_wrappers=1:nokey=1',
      inputPath,
    ]);

    const duration = Number.parseFloat(stdout.trim());
    return Number.isFinite(duration) ? Math.round(duration) : 0;
  }

  private async generateCover(inputPath: string, coverPath: string) {
    try {
      await execFileAsync(FFMPEG_BIN, ['-y', '-i', inputPath, '-ss', '00:00:01', '-vframes', '1', coverPath]);
    } catch {
      await execFileAsync(FFMPEG_BIN, ['-y', '-i', inputPath, '-vframes', '1', coverPath]);
    }
  }

  private async transcodeVideo(inputPath: string, outputPath: string) {
    await execFileAsync(FFMPEG_BIN, [
      '-y',
      '-i',
      inputPath,
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      '28',
      '-c:a',
      'aac',
      '-movflags',
      '+faststart',
      outputPath,
    ]);
  }

  private buildDerivedObjectKey(originalKey: string, folder: string, extension: string) {
    const fileName = path.basename(originalKey).replace(/\.[^.]+$/, `.${extension}`);
    return originalKey.replace('/original/', `/${folder}/`).replace(path.basename(originalKey), fileName);
  }
}
