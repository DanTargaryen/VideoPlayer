const DEFAULT_REPLAY_MIME_TYPE = 'video/webm';
const PLAYABLE_REPLAY_MIME_TYPES = new Set(['video/webm', 'video/mp4']);

export function getReplayContainerMimeType(mimeType: string) {
  const containerMimeType = mimeType.split(';', 1)[0]?.trim().toLowerCase() ?? '';
  return PLAYABLE_REPLAY_MIME_TYPES.has(containerMimeType) ? containerMimeType : DEFAULT_REPLAY_MIME_TYPE;
}

export function createReplayUploadFile(recording: Blob, timestamp = Date.now()) {
  const mimeType = getReplayContainerMimeType(recording.type);
  const extension = mimeType === 'video/mp4' ? 'mp4' : 'webm';
  return new File([recording], `live-recording-${timestamp}.${extension}`, { type: mimeType });
}
