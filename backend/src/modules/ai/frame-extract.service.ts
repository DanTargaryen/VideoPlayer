import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile } from 'node:fs/promises';
import * as path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

interface ExtractFramesOptions {
  inputPath: string;
  workingDir: string;
}

@Injectable()
export class FrameExtractService {
  constructor(private readonly configService: ConfigService) {}

  async extractFrames(options: ExtractFramesOptions): Promise<string[]> {
    const ffmpegBin = this.configService.get<string>('FFMPEG_PATH') || 'ffmpeg';
    const fps = this.getFrameFps();
    const minFrameCount = this.getMinFrameCount();
    const maxFrameCount = Math.max(this.getMaxFrameCount(), minFrameCount);

    const frameDir = path.join(options.workingDir, 'frames');
    await mkdir(frameDir, { recursive: true });
    const outputPattern = path.join(frameDir, 'frame-%03d.jpg');

    try {
      await execFileAsync(ffmpegBin, [
        '-y',
        '-i',
        options.inputPath,
        '-vf',
        `fps=${fps}`,
        '-q:v',
        '3',
        outputPattern,
      ]);
    } catch (error) {
      throw new BadRequestException(`Failed to extract frames with ffmpeg: ${this.getErrorMessage(error)}`);
    }

    const frameFiles = (await readdir(frameDir))
      .filter((name) => name.endsWith('.jpg'))
      .sort((left, right) => left.localeCompare(right))
      .map((name) => path.join(frameDir, name));

    if (frameFiles.length === 0) {
      throw new BadRequestException('No frames extracted from video');
    }

    const deduplicated = await this.removeExactDuplicateFrames(frameFiles);
    let selected = deduplicated.length >= minFrameCount ? deduplicated : frameFiles;
    selected = this.pickEvenlyDistributedFrames(selected, maxFrameCount);

    if (selected.length < minFrameCount && frameFiles.length > selected.length) {
      selected = this.pickEvenlyDistributedFrames(frameFiles, minFrameCount);
    }

    if (selected.length === 0) {
      throw new BadRequestException('Failed to prepare frames for AI summary');
    }

    return selected;
  }

  private getFrameFps() {
    const value = Number(this.configService.get<string>('AI_SUMMARY_FRAME_FPS') ?? '2');
    if (!Number.isFinite(value) || value <= 0) {
      return 2;
    }

    return value;
  }

  private getMinFrameCount() {
    const value = Number(this.configService.get<string>('AI_SUMMARY_MIN_FRAMES') ?? '4');
    if (!Number.isFinite(value) || value < 1) {
      return 4;
    }

    return Math.max(1, Math.floor(value));
  }

  private getMaxFrameCount() {
    const value = Number(this.configService.get<string>('AI_SUMMARY_MAX_FRAMES') ?? '6');
    if (!Number.isFinite(value) || value < 1) {
      return 6;
    }

    return Math.max(1, Math.floor(value));
  }

  private async removeExactDuplicateFrames(frameFiles: string[]) {
    const seenHashes = new Set<string>();
    const uniqueFrames: string[] = [];

    for (const framePath of frameFiles) {
      const file = await readFile(framePath);
      const hash = createHash('sha1').update(file).digest('hex');

      if (seenHashes.has(hash)) {
        continue;
      }

      seenHashes.add(hash);
      uniqueFrames.push(framePath);
    }

    return uniqueFrames;
  }

  private pickEvenlyDistributedFrames(frameFiles: string[], targetCount: number) {
    if (frameFiles.length <= targetCount) {
      return [...frameFiles];
    }

    const pickedIndices = new Set<number>();
    const pickedFiles: string[] = [];
    const lastIndex = frameFiles.length - 1;
    const interval = targetCount === 1 ? 0 : lastIndex / (targetCount - 1);

    for (let i = 0; i < targetCount; i += 1) {
      const index = Math.round(interval * i);
      if (pickedIndices.has(index)) {
        continue;
      }
      pickedIndices.add(index);
      pickedFiles.push(frameFiles[index]);
    }

    if (pickedFiles.length === targetCount) {
      return pickedFiles;
    }

    for (let i = 0; i < frameFiles.length && pickedFiles.length < targetCount; i += 1) {
      if (pickedIndices.has(i)) {
        continue;
      }
      pickedIndices.add(i);
      pickedFiles.push(frameFiles[i]);
    }

    return pickedFiles;
  }

  private getErrorMessage(error: unknown) {
    if (error instanceof Error) {
      return error.message;
    }

    return String(error);
  }
}
