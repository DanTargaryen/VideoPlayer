import { once } from 'node:events';

import { issueServiceToken } from '@videoplayer/shared-contracts';
import { afterEach, describe, expect, it } from 'vitest';

import {
  createContentService,
  createFixtureState,
  createVideoAfterMediaValidation,
  validateVideoMediaType,
  type VideoStreamProbe,
  type ContentServiceOptions,
} from '../src/service.js';

const servers: ReturnType<typeof createContentService>[] = [];
const secret = 'content-media-test-secret-minimum-32-chars';

async function start(options: ContentServiceOptions = {}) {
  const server = createContentService({ internalJwtSecret: secret, ...options });
  servers.push(server);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Expected TCP address');
  return `http://127.0.0.1:${address.port}`;
}

function token(scope: string) {
  return issueServiceToken({
    caller: 'governance-ai',
    audience: 'content-media',
    scopes: [scope],
    secret,
    requestId: 'test-request',
  });
}

async function json(response: Response) {
  return (await response.json()) as { code: number; message: string; data: Record<string, unknown>; requestId: string };
}

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve()))));
});

describe('content-media foundation public APIs', () => {
  it('exposes health and version contracts', async () => {
    const baseUrl = await start();
    expect((await json(await fetch(`${baseUrl}/health/live`))).data.service).toBe('content-media');
    expect((await fetch(`${baseUrl}/health/ready`)).status).toBe(200);
    expect((await fetch(`${baseUrl}/version`)).status).toBe(200);
  });

  it('serves recommend, empty search, details and recommendations without leaking drafts', async () => {
    const baseUrl = await start();

    const recommend = await json(await fetch(`${baseUrl}/api/v1/feeds/recommend`, { headers: { 'x-request-id': 'recommend-1' } }));
    expect(recommend.requestId).toBe('recommend-1');
    expect((recommend.data.items as Array<{ id: string }>).map((item) => item.id)).toEqual(['video-001', 'video-002']);

    const emptySearch = await json(await fetch(`${baseUrl}/api/v1/search/all?keyword=no-match`));
    expect(emptySearch.data.videos).toEqual([]);

    const detail = await json(await fetch(`${baseUrl}/api/v1/videos/video-001`));
    expect((detail.data.video as { id: string }).id).toBe('video-001');
    expect(detail.data.assets).toEqual([
      expect.objectContaining({ videoId: 'video-001', mimeType: 'video/mp4', objectKey: 'videos/video-001.mp4' }),
    ]);

    const draft = await fetch(`${baseUrl}/api/v1/videos/video-draft`);
    expect(draft.status).toBe(404);

    const recommendations = await json(await fetch(`${baseUrl}/api/v1/videos/video-001/recommendations`));
    expect((recommendations.data.items as Array<{ id: string }>).map((item) => item.id)).toEqual(['video-002']);
  });

  it('uses identity batch-summary shape and falls back when identity is unavailable', async () => {
    const baseUrl = await start({
      identityClient: {
        async batchSummary() {
          throw new Error('identity unavailable');
        },
      },
      identityTimeoutMs: 5,
    });

    const response = await json(await fetch(`${baseUrl}/api/v1/feeds/recommend`));
    const first = (response.data.items as Array<{ creator: { nickname: string; unavailable: boolean } }>)[0]!;
    expect(first.creator).toEqual(expect.objectContaining({ nickname: '用户信息暂不可用', unavailable: true }));
  });
});

describe('content-media internal API contracts', () => {
  it('requires service JWT scopes for internal APIs', async () => {
    const baseUrl = await start();
    const response = await fetch(`${baseUrl}/internal/v1/videos/batch-summary`, { method: 'POST', body: JSON.stringify({ ids: ['video-001'] }) });
    expect(response.status).toBe(401);
  });

  it('keeps review decisions idempotent by decisionId', async () => {
    const baseUrl = await start();
    const body = JSON.stringify({ decisionId: 'decision-001', decision: 'HIDDEN', reason: 'policy' });
    const headers = { authorization: `Bearer ${token('internal:review-decision')}`, 'content-type': 'application/json' };

    const first = await json(await fetch(`${baseUrl}/internal/v1/videos/video-001/review-decision`, { method: 'POST', headers, body }));
    const second = await json(await fetch(`${baseUrl}/internal/v1/videos/video-001/review-decision`, { method: 'POST', headers, body }));

    expect(first.data).toEqual(second.data);
    expect(first.data).toEqual(expect.objectContaining({ decisionId: 'decision-001', appliedStatus: 'HIDDEN' }));
  });

  it('updates comment and danmaku text status through the content boundary', async () => {
    const baseUrl = await start();
    const headers = { authorization: `Bearer ${token('internal:text-status')}`, 'content-type': 'application/json' };

    const comment = await json(
      await fetch(`${baseUrl}/internal/v1/videos/video-001/text-status`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ targetType: 'COMMENT', targetId: 'comment-001', status: 'HIDDEN' }),
      }),
    );
    expect(comment.data).toEqual({ targetType: 'COMMENT', targetId: 'comment-001', status: 'HIDDEN' });

    const danmaku = await json(
      await fetch(`${baseUrl}/internal/v1/videos/video-001/text-status`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ targetType: 'DANMAKU', targetId: 'danmaku-001', status: 'HIDDEN' }),
      }),
    );
    expect(danmaku.data).toEqual({ targetType: 'DANMAKU', targetId: 'danmaku-001', status: 'HIDDEN' });
  });

  it('registers replays idempotently by requestId or objectKey', async () => {
    const baseUrl = await start();
    const headers = { authorization: `Bearer ${token('internal:replay')}`, 'content-type': 'application/json' };
    const body = JSON.stringify({ requestId: 'replay-request-001', objectKey: 'replays/session-001.webm', mimeType: 'video/webm' });

    const firstResponse = await fetch(`${baseUrl}/internal/v1/replays`, { method: 'POST', headers, body });
    const secondResponse = await fetch(`${baseUrl}/internal/v1/replays`, { method: 'POST', headers, body });
    const first = await json(firstResponse);
    const second = await json(secondResponse);

    expect(firstResponse.status).toBe(201);
    expect(secondResponse.status).toBe(200);
    expect(first.data).toEqual(second.data);
  });

  it('returns video summaries in stable request order with missing IDs preserved', async () => {
    const baseUrl = await start();
    const response = await json(
      await fetch(`${baseUrl}/internal/v1/videos/batch-summary`, {
        method: 'POST',
        headers: { authorization: `Bearer ${token('internal:video-summary')}`, 'content-type': 'application/json' },
        body: JSON.stringify({ ids: ['missing', 'video-001'] }),
      }),
    );

    expect(response.data.items).toEqual([
      { id: 'missing', found: false },
      expect.objectContaining({ id: 'video-001', found: true, title: 'Spring Architecture Notes' }),
    ]);
  });
});

describe('content-media media boundary helpers', () => {
  const acceptsVideo: VideoStreamProbe = { async probe() { return { ok: true }; } };
  const rejectsVideo: VideoStreamProbe = { async probe() { return { ok: false, reason: 'ffprobe found no video stream' }; } };

  it('rejects disguised mp4 files before object/database creation', async () => {
    const state = createFixtureState();
    const result = await createVideoAfterMediaValidation(
      state,
      { filename: 'fake.mp4', mimeType: 'video/mp4', bytes: Buffer.from('not a video'), objectKey: 'uploads/fake.mp4' },
      async () => {
        throw new Error('should not write database');
      },
      rejectsVideo,
    );

    expect(result).toEqual({ status: 400, message: 'ffprobe found no video stream' });
    expect(state.assets).toHaveLength(1);
    expect(state.videos).toHaveLength(3);
    expect(state.deletedObjects).toEqual([]);
  });

  it('deletes only the current object when database creation fails after upload', async () => {
    const state = createFixtureState();
    const result = await createVideoAfterMediaValidation(
      state,
      { filename: 'real.mp4', mimeType: 'video/mp4', bytes: Buffer.from('0000ftypisom') },
      async () => {
        throw new Error('db down');
      },
      acceptsVideo,
    );

    expect(result.status).toBe(500);
    expect(state.deletedObjects).toHaveLength(1);
    expect(state.deletedObjects[0]).toMatch(/^uploads\/.+\.mp4$/);
  });

  it('rejects unsupported extensions and extension/MIME mismatches before ffprobe', () => {
    expect(validateVideoMediaType({ filename: 'ok.mp4', mimeType: 'video/mp4', bytes: Buffer.from('not inspected yet') })).toEqual({ ok: true });
    expect(validateVideoMediaType({ filename: 'bad.webm', mimeType: 'video/mp4', bytes: Buffer.from('not inspected yet') })).toEqual({
      ok: false,
      reason: 'extension and MIME type do not match',
    });
    expect(validateVideoMediaType({ filename: 'bad.mov', mimeType: 'video/quicktime', bytes: Buffer.from('not inspected yet') })).toEqual({
      ok: false,
      reason: 'unsupported file extension',
    });
  });

  it('does not write records when ffprobe cannot verify a stream', async () => {
    const state = createFixtureState();
    const result = await createVideoAfterMediaValidation(
      state,
      { filename: 'fake.mp4', mimeType: 'video/mp4', bytes: Buffer.from('0000ftypisom') },
      async () => ({ ...state.videos[0]!, id: 'should-not-exist' }),
      rejectsVideo,
    );

    expect(result).toEqual({ status: 400, message: 'ffprobe found no video stream' });
    expect(state.assets).toHaveLength(1);
    expect(state.videos).toHaveLength(3);
  });
});
