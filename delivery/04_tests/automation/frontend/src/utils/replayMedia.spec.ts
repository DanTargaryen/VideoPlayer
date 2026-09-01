import { describe, expect, it } from 'vitest';

import { createReplayUploadFile, getReplayContainerMimeType } from './replayMedia';

describe('replay recording media metadata', () => {
  it.each([
    ['video/webm;codecs=vp9,opus', 'video/webm'],
    ['video/webm;codecs=vp8,opus', 'video/webm'],
    ['video/webm', 'video/webm'],
    ['video/mp4;codecs=avc1', 'video/mp4'],
    ['', 'video/webm'],
  ])('normalizes %s to a container MIME', (input, expected) => {
    expect(getReplayContainerMimeType(input)).toBe(expected);
  });

  it('creates a WebM upload whose filename and MIME describe the same container', () => {
    const blob = new Blob(['recording'], { type: 'video/webm;codecs=vp9,opus' });
    const file = createReplayUploadFile(blob, 12345);

    expect(file.name).toBe('live-recording-12345.webm');
    expect(file.type).toBe('video/webm');
    expect(file.size).toBe(blob.size);
  });

  it('uses an MP4 extension for an MP4 recording', () => {
    const file = createReplayUploadFile(new Blob(['recording'], { type: 'video/mp4;codecs=avc1' }), 67890);

    expect(file.name).toBe('live-recording-67890.mp4');
    expect(file.type).toBe('video/mp4');
  });
});
