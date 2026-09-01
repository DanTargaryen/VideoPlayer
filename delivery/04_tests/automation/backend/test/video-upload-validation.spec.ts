import { BadRequestException } from '@nestjs/common';

import { MediaService } from '../src/modules/video/media.service';
import {
  assertVideoUploadMetadata,
  hasVideoStream,
} from '../src/modules/video/video-upload-validation';

describe('video upload metadata validation', () => {
  it.each([
    ['clip.mp4', 'video/mp4'],
    ['recording.webm', 'video/webm'],
    ['camera.mov', 'video/quicktime'],
  ])('accepts supported extension and MIME pairs', (originalname, mimetype) => {
    expect(() => assertVideoUploadMetadata({ originalname, mimetype, size: 10 })).not.toThrow();
  });

  it.each([
    ['notes.txt', 'text/plain'],
    ['clip.mp4', ''],
    ['clip.mp4', 'video/webm'],
    ['clip.exe', 'video/mp4'],
  ])('rejects unsupported or mismatched metadata', (originalname, mimetype) => {
    expect(() => assertVideoUploadMetadata({ originalname, mimetype, size: 10 })).toThrow(BadRequestException);
  });

  it('requires a non-empty file and an FFprobe video stream', () => {
    expect(() => assertVideoUploadMetadata({ originalname: 'empty.mp4', mimetype: 'video/mp4', size: 0 })).toThrow(
      BadRequestException,
    );
    expect(hasVideoStream('{"streams":[{"codec_type":"audio"}]}')).toBe(false);
    expect(hasVideoStream('{"streams":[{"codec_type":"video"}]}')).toBe(true);
    expect(hasVideoStream('not-json')).toBe(false);
  });
});

describe('MediaService video stream validation', () => {
  it('rejects text bytes disguised as an MP4 before persistence', async () => {
    const service = new MediaService({} as never, {} as never);
    const file = {
      originalname: 'spoofed.mp4',
      mimetype: 'video/mp4',
      size: 18,
      buffer: Buffer.from('plain text payload'),
    } as Express.Multer.File;

    await expect(service.validateVideoUpload(file)).rejects.toBeInstanceOf(BadRequestException);
  });
});
