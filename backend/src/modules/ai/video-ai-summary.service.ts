import {
  BadRequestException,
  InternalServerErrorException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { access } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';

import { MinioService, LOCAL_STORAGE_ROOT } from '../storage/minio.service';
import { AiSummaryService } from './ai-summary.service';
import { FrameExtractService } from './frame-extract.service';
import { VideoAiSummaryRepository } from './video-ai-summary.repository';
import { AiVideoService } from './video.service';

@Injectable()
export class VideoAiSummaryService {
  private readonly logger = new Logger(VideoAiSummaryService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly aiVideoService: AiVideoService,
    private readonly frameExtractService: FrameExtractService,
    private readonly aiSummaryService: AiSummaryService,
    private readonly videoAiSummaryRepository: VideoAiSummaryRepository,
    private readonly minioService: MinioService,
  ) {}

  async summarizeVideo(videoId: number) {
    try {
      const cachedSummary = await this.videoAiSummaryRepository.findByVideoId(videoId);
      if (cachedSummary) {
        return {
          success: true,
          videoId,
          summary: cachedSummary.summary,
          frameCount: cachedSummary.frameCount,
          cached: true,
        };
      }

      const source = await this.aiVideoService.getVideoSource(videoId);
      const workDir = await mkdtemp(path.join(tmpdir(), 'videoplayer-ai-summary-'));

      try {
        const inputPath = await this.prepareVideoInput(source, workDir);
        const framePaths = await this.frameExtractService.extractFrames({
          inputPath,
          workingDir: workDir,
        });
        const summaryResult = await this.aiSummaryService.generateSummary(framePaths);

        await this.videoAiSummaryRepository.saveSummary({
          videoId,
          summary: summaryResult.summary,
          frameCount: framePaths.length,
          model: summaryResult.model,
        });

        return {
          success: true,
          videoId,
          summary: summaryResult.summary,
          frameCount: framePaths.length,
          cached: false,
        };
      } finally {
        await rm(workDir, { recursive: true, force: true });
      }
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }

      this.logger.error(
        `Unexpected error when summarizing video ${videoId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException(
        `AI summary failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async chatWithVideo(videoId: number, prompt: string) {
    try {
      const source = await this.aiVideoService.getVideoSource(videoId);
      const workDir = await mkdtemp(path.join(tmpdir(), 'videoplayer-ai-chat-'));

      try {
        const inputPath = await this.prepareVideoInput(source, workDir);
        const framePaths = await this.frameExtractService.extractFrames({
          inputPath,
          workingDir: workDir,
        });
        const chatResult = await this.aiSummaryService.chatWithFrames(framePaths, prompt);

        return {
          success: true,
          videoId,
          reply: chatResult.reply,
          frameCount: framePaths.length,
        };
      } finally {
        await rm(workDir, { recursive: true, force: true });
      }
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }

      this.logger.error(
        `Unexpected error when chatting with video ${videoId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException(
        `AI chat failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async prepareVideoInput(source: Awaited<ReturnType<AiVideoService['getVideoSource']>>, workDir: string) {
    if (source.sourceType === 'object') {
      const downloadPath = path.join(workDir, 'input.mp4');
      if (!source.objectKey) {
        throw new NotFoundException('Video object key not found');
      }
      try {
        await this.minioService.downloadObjectToFile(source.objectKey, downloadPath);
      } catch (error) {
        throw new NotFoundException(
          `Video file not found: failed to download object ${source.objectKey} (${this.getErrorMessage(error)})`,
        );
      }

      return downloadPath;
    }

    return this.resolveSourceUrlInput(source.sourceUrl);
  }

  private async resolveSourceUrlInput(sourceUrlRaw?: string) {
    const sourceUrl = sourceUrlRaw?.trim();
    if (!sourceUrl) {
      throw new NotFoundException('Video file not found');
    }

    if (sourceUrl.startsWith('/storage/')) {
      const relativePath = sourceUrl.slice('/storage/'.length);
      const localPath = path.join(LOCAL_STORAGE_ROOT, relativePath);
      await this.ensureReadableFile(localPath);
      return localPath;
    }

    if (path.isAbsolute(sourceUrl)) {
      await this.ensureReadableFile(sourceUrl);
      return sourceUrl;
    }

    if (sourceUrl.startsWith('http://') || sourceUrl.startsWith('https://')) {
      return sourceUrl;
    }

    const storageMode = this.configService.get<string>('STORAGE_BACKEND') || 'minio';
    throw new BadRequestException(
      `Video source is not supported in ${storageMode} mode. Please ensure video assets are available.`,
    );
  }

  private async ensureReadableFile(filePath: string) {
    try {
      await access(filePath, fsConstants.R_OK);
    } catch {
      throw new NotFoundException('Video file not found');
    }
  }

  private getErrorMessage(error: unknown) {
    if (error instanceof Error) {
      return error.message;
    }

    return String(error);
  }
}
