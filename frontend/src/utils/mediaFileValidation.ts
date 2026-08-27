type VideoFileMetadata = Pick<File, 'name' | 'type' | 'size'>;

const VIDEO_MIME_TYPES_BY_EXTENSION: Readonly<Record<string, readonly string[]>> = {
  '.mp4': ['video/mp4'],
  '.m4v': ['video/mp4', 'video/x-m4v'],
  '.webm': ['video/webm'],
  '.mov': ['video/quicktime'],
  '.mkv': ['video/x-matroska'],
  '.avi': ['video/avi', 'video/x-msvideo'],
  '.flv': ['video/x-flv'],
};

const VIDEO_EXTENSIONS = Object.keys(VIDEO_MIME_TYPES_BY_EXTENSION);
const VIDEO_MIME_TYPES = Array.from(new Set(Object.values(VIDEO_MIME_TYPES_BY_EXTENSION).flat()));

export const VIDEO_FILE_ACCEPT = [...VIDEO_EXTENSIONS, ...VIDEO_MIME_TYPES].join(',');

export function getVideoFileValidationError(file: VideoFileMetadata) {
  if (!Number.isFinite(file.size) || file.size <= 0) {
    return '视频文件不能为空';
  }

  const extension = getFileExtension(file.name);
  const acceptedMimeTypes = VIDEO_MIME_TYPES_BY_EXTENSION[extension];
  if (!acceptedMimeTypes) {
    return '不支持该视频文件扩展名';
  }

  const mimeType = file.type.split(';', 1)[0]?.trim().toLowerCase() ?? '';
  if (!mimeType) {
    return '无法识别视频文件类型';
  }

  if (!acceptedMimeTypes.includes(mimeType)) {
    return '视频文件扩展名与类型不匹配';
  }

  return '';
}

function getFileExtension(fileName: string) {
  const extensionIndex = fileName.lastIndexOf('.');
  return extensionIndex >= 0 ? fileName.slice(extensionIndex).toLowerCase() : '';
}
