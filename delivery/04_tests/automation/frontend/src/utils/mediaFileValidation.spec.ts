import { describe, expect, it } from 'vitest';

import { getVideoFileValidationError, VIDEO_FILE_ACCEPT } from './mediaFileValidation';

describe('video file metadata validation', () => {
  it.each([
    ['clip.mp4', 'video/mp4'],
    ['recording.webm', 'video/webm'],
    ['camera.mov', 'video/quicktime'],
  ])('accepts supported extension and MIME pairs', (name, type) => {
    expect(getVideoFileValidationError({ name, type, size: 10 })).toBe('');
  });

  it.each([
    ['notes.txt', 'text/plain'],
    ['clip.mp4', ''],
    ['clip.mp4', 'video/webm'],
    ['clip.exe', 'video/mp4'],
  ])('rejects invalid extension or MIME metadata', (name, type) => {
    expect(getVideoFileValidationError({ name, type, size: 10 })).not.toBe('');
  });

  it('rejects an empty file and advertises explicit accepted formats', () => {
    expect(getVideoFileValidationError({ name: 'empty.mp4', type: 'video/mp4', size: 0 })).not.toBe('');
    expect(VIDEO_FILE_ACCEPT).toContain('.mp4');
    expect(VIDEO_FILE_ACCEPT).toContain('video/webm');
  });
});
