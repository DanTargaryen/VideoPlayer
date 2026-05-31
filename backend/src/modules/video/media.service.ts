import { Injectable, Logger } from '@nestjs/common';
import { execFile } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { promisify } from 'node:util';

import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../storage/minio.service';
import { findWorkingBinary, getBinaryCandidates } from '../../common/utils/ffmpeg-binary';

const execFileAsync = promisify(execFile);

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private ffmpegAvailable = false;
  private ffmpegBin = 'ffmpeg';
  private ffprobeBin = 'ffprobe';
  private lastBinaryWarningAt = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly minioService: MinioService,
  ) {}

  private async checkFfmpegAvailable(): Promise<boolean> {
    const ffmpegBin = await findWorkingBinary(getBinaryCandidates('FFMPEG_PATH', 'ffmpeg'));
    const ffprobeBin = await findWorkingBinary(getBinaryCandidates('FFPROBE_PATH', 'ffprobe'));

    if (ffmpegBin && ffprobeBin) {
      const changed =
        !this.ffmpegAvailable || this.ffmpegBin !== ffmpegBin || this.ffprobeBin !== ffprobeBin;
      this.ffmpegAvailable = true;
      this.ffmpegBin = ffmpegBin;
      this.ffprobeBin = ffprobeBin;
      if (changed) {
        this.logger.log(`FFmpeg found: ${this.ffmpegBin}, FFprobe found: ${this.ffprobeBin}`);
      }
      return true;
    }

    this.ffmpegAvailable = false;
    const now = Date.now();
    if (now - this.lastBinaryWarningAt > 30_000) {
      this.lastBinaryWarningAt = now;
      this.logger.warn(
        `FFmpeg/FFprobe not found (ffmpeg candidates=${getBinaryCandidates('FFMPEG_PATH', 'ffmpeg').join(', ')}, ` +
          `ffprobe candidates=${getBinaryCandidates('FFPROBE_PATH', 'ffprobe').join(', ')}). ` +
          'Video processing (duration probe, cover generation, transcoding) will be skipped. ' +
          'Please install FFmpeg and ensure it is in PATH, or set FFMPEG_PATH / FFPROBE_PATH in .env.',
      );
    }
    return false;
  }

  async probeVideoDuration(videoId: number, originalAssetId: number): Promise<number> {
    const originalAsset = await this.prisma.videoAsset.findUnique({ where: { id: originalAssetId } });

    if (!originalAsset) {
      this.logger.warn(`Original asset ${originalAssetId} not found for duration probe`);
      return 0;
    }

    if (!(await this.checkFfmpegAvailable())) {
      this.logger.warn(`Duration probe skipped for video ${videoId}: FFmpeg not available`);
      return 0;
    }

    const workDir = await mkdtemp(path.join(tmpdir(), 'videoplayer-duration-'));
    const inputPath = path.join(workDir, 'input');

    try {
      await this.minioService.downloadObjectToFile(originalAsset.objectKey, inputPath);
      const durationSeconds = await this.probeDuration(inputPath);

      if (durationSeconds > 0) {
        await this.prisma.video.update({
          where: { id: videoId },
          data: { durationSeconds },
        });
      }

      return durationSeconds;
    } catch (error) {
      const message = error instanceof Error ? (error.stack ?? error.message) : String(error);
      this.logger.warn(`Duration probe failed for video ${videoId}: ${message}`);
      return 0;
    } finally {
      await rm(workDir, { recursive: true, force: true });
    }
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

      const video = await this.prisma.video.findUnique({
        where: { id: videoId },
        select: { durationSeconds: true },
      });
      const alreadyHasDuration = video && video.durationSeconds != null && video.durationSeconds > 0;
      const videoUpdate: { durationSeconds?: number; playUrl?: string; coverUrl?: string } = {};

      if (!alreadyHasDuration) {
        const durationSeconds = await this.probeDuration(inputPath);
        if (durationSeconds > 0) {
          videoUpdate.durationSeconds = durationSeconds;
        }
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
      const message = error instanceof Error ? (error.stack ?? error.message) : String(error);
      this.logger.warn(`Media processing skipped for video ${videoId}: ${message}`);
    } finally {
      await rm(workDir, { recursive: true, force: true });
    }
  }

  private async probeDuration(inputPath: string) {
    const { stdout } = await execFileAsync(this.ffprobeBin, [
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
      await execFileAsync(this.ffmpegBin, ['-y', '-i', inputPath, '-ss', '00:00:01', '-vframes', '1', coverPath]);
    } catch {
      await execFileAsync(this.ffmpegBin, ['-y', '-i', inputPath, '-vframes', '1', coverPath]);
    }
  }

  private async transcodeVideo(inputPath: string, outputPath: string) {
    await execFileAsync(this.ffmpegBin, [
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
