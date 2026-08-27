import { BadRequestException } from '@nestjs/common';
import * as path from 'node:path';

type VideoUploadMetadata = Pick<Express.Multer.File, 'originalname' | 'mimetype' | 'size'>;

const VIDEO_MIME_TYPES_BY_EXTENSION = new Map<string, ReadonlySet<string>>([
  ['.mp4', new Set(['video/mp4'])],
  ['.m4v', new Set(['video/mp4', 'video/x-m4v'])],
  ['.webm', new Set(['video/webm'])],
  ['.mov', new Set(['video/quicktime'])],
  ['.mkv', new Set(['video/x-matroska'])],
  ['.avi', new Set(['video/avi', 'video/x-msvideo'])],
  ['.flv', new Set(['video/x-flv'])],
]);

export function assertVideoUploadMetadata(file: VideoUploadMetadata) {
  if (!Number.isFinite(file.size) || file.size <= 0) {
    throw new BadRequestException('Video file is empty');
  }

  const extension = path.extname(file.originalname).toLowerCase();
  const acceptedMimeTypes = VIDEO_MIME_TYPES_BY_EXTENSION.get(extension);
  if (!acceptedMimeTypes) {
    throw new BadRequestException('Unsupported video file extension');
  }

  const mimeType = normalizeMimeType(file.mimetype);
  if (!mimeType) {
    throw new BadRequestException('Video MIME type is required');
  }

  if (!acceptedMimeTypes.has(mimeType)) {
    throw new BadRequestException('Video file extension and MIME type do not match');
  }
}

export function hasVideoStream(ffprobeOutput: string) {
  try {
    const payload = JSON.parse(ffprobeOutput) as { streams?: Array<{ codec_type?: unknown }> };
    return Array.isArray(payload.streams) && payload.streams.some((stream) => stream.codec_type === 'video');
  } catch {
    return false;
  }
}

function normalizeMimeType(mimeType: string) {
  return mimeType.split(';', 1)[0]?.trim().toLowerCase() ?? '';
}
