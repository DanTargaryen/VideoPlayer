import type { IncomingMessage } from 'node:http';

export type UploadedPart = {
  filename: string;
  mimeType: string;
  bytes: Buffer;
};

export async function readSingleFileMultipart(request: IncomingMessage, maximumBytes: number): Promise<UploadedPart> {
  const contentType = String(request.headers['content-type'] ?? '');
  const boundaryMatch = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType);
  const boundary = (boundaryMatch?.[1] ?? boundaryMatch?.[2] ?? '').trim();
  if (!boundary || boundary.length > 200) throw new Error('multipart boundary is required');
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.from(chunk);
    size += buffer.length;
    if (size > maximumBytes) throw new Error('upload exceeds the configured size limit');
    chunks.push(buffer);
  }
  const body = Buffer.concat(chunks);
  const delimiter = Buffer.from(`--${boundary}`);
  const headerSeparator = Buffer.from('\r\n\r\n');
  let cursor = body.indexOf(delimiter);
  while (cursor >= 0) {
    const headerStart = cursor + delimiter.length + 2;
    const headerEnd = body.indexOf(headerSeparator, headerStart);
    if (headerEnd < 0) break;
    const headers = body.subarray(headerStart, headerEnd).toString('utf8');
    const disposition = /content-disposition:\s*form-data;([^\r\n]+)/i.exec(headers)?.[1] ?? '';
    const fieldName = /(?:^|;)\s*name="([^"]+)"/i.exec(disposition)?.[1];
    const filename = /(?:^|;)\s*filename="([^"]*)"/i.exec(disposition)?.[1];
    const mimeType = /content-type:\s*([^\r\n]+)/i.exec(headers)?.[1]?.trim() ?? 'application/octet-stream';
    const dataStart = headerEnd + headerSeparator.length;
    const nextBoundary = body.indexOf(Buffer.from(`\r\n--${boundary}`), dataStart);
    if (nextBoundary < 0) break;
    if (fieldName === 'file' && filename) {
      return { filename: filename.replace(/[\\/]/g, '_').slice(0, 255), mimeType, bytes: body.subarray(dataStart, nextBoundary) };
    }
    cursor = body.indexOf(delimiter, nextBoundary + 2);
  }
  throw new Error('multipart file field is required');
}
