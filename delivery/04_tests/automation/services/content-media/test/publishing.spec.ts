import { once } from 'node:events';
import { Readable } from 'node:stream';

import { issueServiceToken } from '@videoplayer/shared-contracts';
import { afterEach, describe, expect, it } from 'vitest';

import { createContentService, createFixtureState } from '../src/service.js';
import type { ContentObjectStorage } from '../src/object-storage.js';

const secret = 'content-publishing-test-secret-0123456789';
const servers: ReturnType<typeof createContentService>[] = [];

async function start(options: Parameters<typeof createContentService>[0]) {
  const server = createContentService({ internalJwtSecret: secret, ...options });
  servers.push(server);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Expected TCP address');
  return `http://127.0.0.1:${address.port}`;
}

function headers(requestId: string, userId = 1) {
  const token = issueServiceToken({ caller: 'gateway', audience: 'content-media', scopes: ['content.user.forward'], secret, requestId });
  return {
    'x-request-id': requestId,
    'x-gateway-authorization': `Bearer ${token}`,
    'x-user-id': String(userId),
    'x-user-role': 'USER',
    'x-user-nickname': encodeURIComponent(`发布者${userId}`),
  };
}

async function payload(response: Response) {
  return await response.json() as { code: number; message: string; data: Record<string, unknown> };
}

class MemoryObjectStorage implements ContentObjectStorage {
  readonly objects = new Map<string, { bytes: Buffer; mimeType: string }>();
  async ready() { return true; }
  async put(input: { objectKey: string; bytes: Buffer; mimeType: string }) {
    this.objects.set(input.objectKey, { bytes: input.bytes, mimeType: input.mimeType });
    return { bucket: 'test-content', objectKey: input.objectKey, size: input.bytes.length, mimeType: input.mimeType, url: `/api/v1/media/objects/${encodeURIComponent(input.objectKey)}` };
  }
  async remove(_bucket: string, objectKey: string) { this.objects.delete(objectKey); }
  async stat(objectKey: string) {
    const item = this.objects.get(objectKey);
    if (!item) throw new Error('not found');
    return { size: item.bytes.length, mimeType: item.mimeType };
  }
  async stream(objectKey: string, offset: number, length: number) {
    const item = this.objects.get(objectKey);
    if (!item) throw new Error('not found');
    return Readable.from(item.bytes.subarray(offset, offset + length));
  }
}

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve()))));
});

describe('content publishing APIs', () => {
  it('uploads, creates, edits, reviews, aggregates, proxies ranges, withdraws and deletes a draft', async () => {
    const state = createFixtureState();
    const storage = new MemoryObjectStorage();
    const reviews: Array<Record<string, unknown>> = [];
    const baseUrl = await start({
      state,
      objectStorage: storage,
      videoStreamProbe: { async probe() { return { ok: true }; } },
      liveWalletClient: { async wallet() { return { balance: 13 }; } },
      governanceClient: {
        async submitVideoReview(videoId, requestId) {
          reviews.push({ id: 91, videoId, status: 'PENDING', reason: null, createdAt: new Date().toISOString(), reviewedAt: null });
          return { id: 91, targetType: 'VIDEO', targetId: videoId, requestId };
        },
        async listVideoReviews() { return reviews; },
        async withdrawVideoReview() { reviews.splice(0); },
      },
    });

    const form = new FormData();
    form.set('file', new Blob([Buffer.from('synthetic-video-bytes')], { type: 'video/mp4' }), 'lesson.mp4');
    const upload = await fetch(`${baseUrl}/api/v1/videos/upload?assetType=ORIGINAL`, { method: 'POST', headers: headers('publishing-upload'), body: form });
    expect(upload.status).toBe(200);
    const uploaded = await payload(upload);
    expect(uploaded.data).toEqual(expect.objectContaining({ assetId: 1_000_001, assetType: 'ORIGINAL' }));

    const create = await fetch(`${baseUrl}/api/v1/videos`, {
      method: 'POST',
      headers: { ...headers('publishing-create'), 'content-type': 'application/json' },
      body: JSON.stringify({ assetId: uploaded.data.assetId, title: '独立内容投稿', description: '真实 publishing contract', categories: ['tech', 'study'], durationSeconds: 30 }),
    });
    expect(create.status).toBe(200);
    const created = await payload(create);
    expect(created.data).toEqual(expect.objectContaining({ id: 1_000_001, status: 'DRAFT', title: '独立内容投稿', categories: ['tech', 'study'] }));

    const media = await fetch(`${baseUrl}${uploaded.data.url}`, { headers: { range: 'bytes=0-3' } });
    expect(media.status).toBe(206);
    expect(media.headers.get('content-range')).toBe('bytes 0-3/21');
    expect(Buffer.from(await media.arrayBuffer()).toString()).toBe('synt');

    const update = await fetch(`${baseUrl}/api/v1/videos/${created.data.id}`, {
      method: 'PUT',
      headers: { ...headers('publishing-update'), 'content-type': 'application/json' },
      body: JSON.stringify({ title: '独立内容投稿已更新', categories: ['study'] }),
    });
    expect((await payload(update)).data).toEqual(expect.objectContaining({ title: '独立内容投稿已更新', categories: ['study'] }));

    expect((await fetch(`${baseUrl}/api/v1/videos/${created.data.id}/submit-review`, { method: 'POST', headers: headers('publishing-submit') })).status).toBe(200);
    const history = await payload(await fetch(`${baseUrl}/api/v1/videos/${created.data.id}/reviews`, { headers: headers('publishing-history') }));
    expect(history.data).toHaveLength(1);
    expect((await fetch(`${baseUrl}/api/v1/videos/${created.data.id}/withdraw-review`, { method: 'POST', headers: headers('publishing-withdraw') })).status).toBe(200);

    const videos = await payload(await fetch(`${baseUrl}/api/v1/creator/videos`, { headers: headers('publishing-videos') }));
    expect((videos.data as unknown as Array<{ id: number }>).some((item) => item.id === created.data.id)).toBe(true);
    const dashboard = await payload(await fetch(`${baseUrl}/api/v1/creator/dashboard`, { headers: headers('publishing-dashboard') }));
    expect(dashboard.data).toEqual(expect.objectContaining({ totalVideos: 3, coinBalance: 13 }));

    const deletion = await fetch(`${baseUrl}/api/v1/videos/${created.data.id}`, { method: 'DELETE', headers: headers('publishing-delete') });
    expect(deletion.status).toBe(200);
    expect(storage.objects.size).toBe(0);
    expect((await fetch(`${baseUrl}${uploaded.data.url}`)).status).toBe(404);
  });

  it('rejects invalid media before object or database persistence', async () => {
    const state = createFixtureState();
    const storage = new MemoryObjectStorage();
    const baseUrl = await start({ state, objectStorage: storage, videoStreamProbe: { async probe() { return { ok: false, reason: 'no video stream' }; } } });
    const form = new FormData();
    form.set('file', new Blob([Buffer.from('fake')], { type: 'video/mp4' }), 'fake.mp4');
    const response = await fetch(`${baseUrl}/api/v1/videos/upload`, { method: 'POST', headers: headers('publishing-invalid'), body: form });
    expect(response.status).toBe(400);
    expect(storage.objects.size).toBe(0);
    expect(state.assets).toHaveLength(1);
  });
});
