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
import { GovernanceReviewError } from '../src/governance-client.js';

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

function trustedCreatorHeaders(requestId: string, id = 1, role = 'USER') {
  const gatewayToken = issueServiceToken({
    caller: 'gateway',
    audience: 'content-media',
    scopes: ['content.user.forward'],
    secret,
    requestId,
  });
  return {
    'x-gateway-authorization': `Bearer ${gatewayToken}`,
    'x-request-id': requestId,
    'x-user-id': String(id),
    'x-user-nickname': encodeURIComponent(`用户${id}`),
    'x-user-role': role,
  };
}

async function json(response: Response) {
  return (await response.json()) as { code: number; message: string; data: Record<string, unknown>; requestId: string };
}

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve()))));
});

describe('content-media foundation public APIs', () => {
  it('exposes health and version contracts', async () => {
    const baseUrl = await start({ state: createFixtureState() });
    expect((await json(await fetch(`${baseUrl}/health/live`))).data.service).toBe('content-media');
    expect((await fetch(`${baseUrl}/health/ready`)).status).toBe(200);
    expect((await fetch(`${baseUrl}/version`)).status).toBe(200);
  });

  it('returns 503 readiness when the content database repository is unavailable', async () => {
    const baseUrl = await start({
      repository: {
        async ready() { return false; },
        async listRecommended() { return []; },
        async search() { throw new Error('unused'); },
        async findPublishedVideo() { return null; },
        async listRelated() { return null; },
        async listAssets() { return []; },
        async submitReview() { throw new Error('unused'); },
        async rollbackReviewSubmission() { throw new Error('unused'); },
        async applyReviewDecision() { throw new Error('unused'); },
        async updateTextStatus() { throw new Error('unused'); },
        async registerReplay() { throw new Error('unused'); },
        async batchSummary() { return []; },
        async moderationTarget() { return null; },
      },
    });

    expect((await fetch(`${baseUrl}/health/ready`)).status).toBe(503);
  });

  it('serves recommend, empty search, details and recommendations without leaking drafts', async () => {
    const baseUrl = await start({ state: createFixtureState() });

    const recommend = await json(await fetch(`${baseUrl}/api/v1/feeds/recommend`, { headers: { 'x-request-id': 'recommend-1' } }));
    expect(recommend.requestId).toBe('recommend-1');
    expect((recommend.data as unknown as Array<{ id: number }>).map((item) => item.id)).toEqual([1, 2]);

    const emptySearch = await json(await fetch(`${baseUrl}/api/v1/search/all?keyword=no-match`));
    expect(emptySearch.data.video).toEqual([]);
    expect(emptySearch.data).toEqual(expect.objectContaining({ tab: 'video', sortBy: 'best', page: 1, pageSize: 20 }));
    expect(emptySearch.data.counts).toEqual({ video: 0, user: 0, live: 0 });

    const detail = await json(await fetch(`${baseUrl}/api/v1/videos/1`));
    expect(detail.data).toEqual(expect.objectContaining({ id: 1, isLiked: false, isFavorited: false, myCoinCount: 0 }));
    expect(detail.data.creator).toEqual(expect.objectContaining({ id: 1, nickname: 'Creator One', role: 'USER' }));

    const draft = await fetch(`${baseUrl}/api/v1/videos/3`);
    expect(draft.status).toBe(404);

    const recommendations = await json(await fetch(`${baseUrl}/api/v1/videos/1/recommendations`));
    expect((recommendations.data as unknown as Array<{ id: number }>).map((item) => item.id)).toEqual([2]);
  });

  it('uses identity batch-summary shape and falls back when identity is unavailable', async () => {
    const baseUrl = await start({
      state: createFixtureState(),
      identityClient: {
        async batchSummary() {
          throw new Error('identity unavailable');
        },
      },
      identityTimeoutMs: 5,
    });

    const response = await json(await fetch(`${baseUrl}/api/v1/feeds/recommend`));
    const first = (response.data as unknown as Array<{ creator: { nickname: string } }>)[0]!;
    expect(first.creator).toEqual(expect.objectContaining({ nickname: '用户信息暂不可用' }));
  });

  it('keeps interaction writes idempotent and serves the same content-owned reads', async () => {
    const state = createFixtureState();
    const baseUrl = await start({ state, notificationClient: null });
    const jsonHeaders = (requestId: string, id = 2) => ({ ...trustedCreatorHeaders(requestId, id), 'content-type': 'application/json' });

    const commentBody = JSON.stringify({ content: '新的根评论' });
    const firstComment = await fetch(`${baseUrl}/api/v1/videos/1/comments`, { method: 'POST', headers: jsonHeaders('interaction-comment'), body: commentBody });
    const replayedComment = await fetch(`${baseUrl}/api/v1/videos/1/comments`, { method: 'POST', headers: jsonHeaders('interaction-comment'), body: commentBody });
    expect(firstComment.status).toBe(200);
    expect((await json(firstComment)).data).toEqual((await json(replayedComment)).data);
    expect(state.comments).toHaveLength(2);
    expect(state.videos[0]?.commentCount).toBe(2);
    expect((await fetch(`${baseUrl}/api/v1/videos/1/comments`, { method: 'POST', headers: jsonHeaders('interaction-comment'), body: JSON.stringify({ content: '冲突载荷' }) })).status).toBe(409);

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const like = await fetch(`${baseUrl}/api/v1/videos/1/like`, { method: 'POST', headers: trustedCreatorHeaders('interaction-like', 2) });
      expect(like.status).toBe(200);
      expect((await json(like)).data).toEqual({ liked: true });
    }
    expect(state.likes).toHaveLength(1);
    expect(state.videos[0]?.likeCount).toBe(40);

    const folder = await json(await fetch(`${baseUrl}/api/v1/videos/my/favorite-folders`, {
      method: 'POST',
      headers: jsonHeaders('interaction-folder'),
      body: JSON.stringify({ name: '课程收藏' }),
    }));
    const favorite = await fetch(`${baseUrl}/api/v1/videos/1/favorite`, {
      method: 'POST',
      headers: jsonHeaders('interaction-favorite'),
      body: JSON.stringify({ folderId: folder.data.id }),
    });
    expect(favorite.status).toBe(200);
    expect((await json(favorite)).data).toEqual(expect.objectContaining({ favorited: true, folderName: '课程收藏' }));
    expect((await json(await fetch(`${baseUrl}/api/v1/videos/my/favorites?folderId=${folder.data.id}`, { headers: trustedCreatorHeaders('interaction-favorite-list', 2) }))).data).toHaveLength(1);

    for (let attempt = 0; attempt < 2; attempt += 1) {
      expect((await fetch(`${baseUrl}/api/v1/videos/1/play`, { method: 'POST', headers: { 'x-request-id': 'interaction-play', 'content-type': 'application/json' }, body: JSON.stringify({ videoDurationSeconds: 92 }) })).status).toBe(200);
    }
    expect(state.videos[0]?.playCount).toBe(411);

    const watch = await fetch(`${baseUrl}/api/v1/videos/1/watch-progress`, {
      method: 'POST',
      headers: jsonHeaders('interaction-watch'),
      body: JSON.stringify({ watchedSeconds: 90, currentTimeSeconds: 92, videoDurationSeconds: 92, event: 'ended' }),
    });
    expect(watch.status).toBe(200);
    expect(state.watches[0]).toMatchObject({ completedCount: 1, totalWatchDurationSeconds: 90 });

    const danmaku = await fetch(`${baseUrl}/api/v1/videos/1/danmaku`, {
      method: 'POST',
      headers: jsonHeaders('interaction-danmaku'),
      body: JSON.stringify({ content: '弹幕测试', timeOffsetMs: 2_345, color: '#12abef' }),
    });
    expect(danmaku.status).toBe(200);
    expect((await json(danmaku)).data).toEqual(expect.objectContaining({ content: '弹幕测试', timeOffsetMs: 2_345, color: '#12ABEF' }));
    expect((await json(await fetch(`${baseUrl}/api/v1/videos/1/danmaku?fromMs=2000&toMs=3000`))).data).toHaveLength(1);

    const detail = await json(await fetch(`${baseUrl}/api/v1/videos/1`, { headers: trustedCreatorHeaders('interaction-detail', 2) }));
    expect(detail.data).toEqual(expect.objectContaining({ isLiked: true, isFavorited: true }));
  });

  it('keeps the main write successful when identity notification delivery fails', async () => {
    const state = createFixtureState();
    const baseUrl = await start({
      state,
      notificationClient: {
        async deliver() {
          throw new Error('identity unavailable');
        },
      },
    });
    const response = await fetch(`${baseUrl}/api/v1/videos/1/like`, { method: 'POST', headers: trustedCreatorHeaders('notification-outbox-like', 2) });
    expect(response.status).toBe(200);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(state.likes).toHaveLength(1);
    expect(state.notificationOutbox).toHaveLength(1);
    expect(state.notificationOutbox[0]).toMatchObject({ status: 'PENDING', attempts: 1, lastError: 'identity unavailable' });
  });

  it('delivers the durable notification outbox without duplicating the main write', async () => {
    const state = createFixtureState();
    const delivered: Array<{ requestId: string; recipientId: string; type: string }> = [];
    const baseUrl = await start({
      state,
      notificationClient: {
        async deliver(notification) {
          delivered.push(notification);
        },
      },
    });
    const requestId = 'notification-outbox-success';
    for (let attempt = 0; attempt < 2; attempt += 1) {
      expect((await fetch(`${baseUrl}/api/v1/videos/1/favorite`, {
        method: 'POST',
        headers: { ...trustedCreatorHeaders(requestId, 2), 'content-type': 'application/json' },
        body: '{}',
      })).status).toBe(200);
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(state.favorites).toHaveLength(1);
    expect(delivered).toHaveLength(1);
    expect(delivered[0]).toMatchObject({ requestId: `${requestId}:notification`, recipientId: '1', type: 'FAVORITE' });
    expect(state.notificationOutbox[0]).toMatchObject({ status: 'DELIVERED', attempts: 0 });
  });

  it('rejects forged direct interaction writes without the gateway user JWT', async () => {
    const baseUrl = await start({ state: createFixtureState() });
    expect((await fetch(`${baseUrl}/api/v1/videos/1/like`, { method: 'POST', headers: { 'x-user-id': '2' } })).status).toBe(401);
  });

  it('submits an owned draft to governance and exposes the pending target snapshot', async () => {
    const state = createFixtureState();
    let submissions = 0;
    const baseUrl = await start({
      state,
      governanceClient: {
        async submitVideoReview(videoId, requestId) {
          submissions += 1;
          expect(videoId).toBe('3');
          return { id: 41, targetType: 'VIDEO', targetId: videoId, requestId };
        },
      },
    });
    const response = await fetch(`${baseUrl}/api/v1/videos/3/submit-review`, {
      method: 'POST',
      headers: trustedCreatorHeaders('submit-review-1'),
    });
    expect(response.status).toBe(200);
    expect((await json(response)).data).toEqual({ videoId: 3, reviewId: 41, status: 'PENDING_REVIEW' });
    const replay = await fetch(`${baseUrl}/api/v1/videos/3/submit-review`, {
      method: 'POST',
      headers: trustedCreatorHeaders('submit-review-1'),
    });
    expect(replay.status).toBe(200);
    expect((await json(replay)).data).toEqual({ videoId: 3, reviewId: 41, status: 'PENDING_REVIEW' });
    expect(submissions).toBe(2);
    expect(state.videos.find((video) => video.id === '3')?.status).toBe('PENDING_REVIEW');
    expect(state.videos.find((video) => video.id === '3')?.reviewSubmissionRequestId).toBe('submit-review-1');
  });

  it('keeps an uncertain submission pending and completes it when the same requestId is retried', async () => {
    const state = createFixtureState();
    let unavailable = true;
    const baseUrl = await start({
      state,
      governanceClient: {
        async submitVideoReview(videoId, requestId) {
          if (unavailable) throw new GovernanceReviewError('governance unavailable', true, true);
          return { id: 42, targetType: 'VIDEO', targetId: videoId, requestId };
        },
      },
    });

    expect((await fetch(`${baseUrl}/api/v1/videos/3/submit-review`, {
      method: 'POST',
      headers: trustedCreatorHeaders('submit-review-forbidden', 2),
    })).status).toBe(403);
    expect((await fetch(`${baseUrl}/api/v1/videos/3/submit-review`, {
      method: 'POST',
      headers: trustedCreatorHeaders('submit-review-retry'),
    })).status).toBe(503);
    expect(state.videos.find((video) => video.id === '3')).toMatchObject({ status: 'PENDING_REVIEW', reviewSubmissionRequestId: 'submit-review-retry' });

    unavailable = false;
    const replay = await fetch(`${baseUrl}/api/v1/videos/3/submit-review`, {
      method: 'POST',
      headers: trustedCreatorHeaders('submit-review-retry'),
    });
    expect(replay.status).toBe(200);
    expect((await json(replay)).data).toEqual({ videoId: 3, reviewId: 42, status: 'PENDING_REVIEW' });
  });

  it('rolls back only a definitive governance rejection', async () => {
    const state = createFixtureState();
    const baseUrl = await start({
      state,
      governanceClient: {
        async submitVideoReview() {
          throw new GovernanceReviewError('governance rejected submission', false, false);
        },
      },
    });
    expect((await fetch(`${baseUrl}/api/v1/videos/3/submit-review`, {
      method: 'POST',
      headers: trustedCreatorHeaders('submit-review-rejected'),
    })).status).toBe(502);
    expect(state.videos.find((video) => video.id === '3')).toMatchObject({
      status: 'DRAFT',
      reviewSubmissionRequestId: null,
      submittedAt: null,
    });
  });
});

describe('content-media internal API contracts', () => {
  it('requires service JWT scopes for internal APIs', async () => {
    const baseUrl = await start({ state: createFixtureState() });
    const response = await fetch(`${baseUrl}/internal/v1/videos/batch-summary`, { method: 'POST', body: JSON.stringify({ ids: ['1'] }) });
    expect(response.status).toBe(401);
  });

  it('keeps review decisions idempotent by decisionId', async () => {
    const baseUrl = await start({ state: createFixtureState() });
    const body = JSON.stringify({ decisionId: 'decision-001', decision: 'HIDDEN', reason: 'policy' });
    const headers = { authorization: `Bearer ${token('internal:review-decision')}`, 'content-type': 'application/json' };

    const first = await json(await fetch(`${baseUrl}/internal/v1/videos/1/review-decision`, { method: 'POST', headers, body }));
    const second = await json(await fetch(`${baseUrl}/internal/v1/videos/1/review-decision`, { method: 'POST', headers, body }));

    expect(first.data).toEqual(second.data);
    expect(first.data).toEqual(expect.objectContaining({ decisionId: 'decision-001', appliedStatus: 'HIDDEN' }));
  });

  it('persists rejection reasons and stamps the first approval publication time', async () => {
    const state = createFixtureState();
    const baseUrl = await start({ state });
    const headers = { authorization: `Bearer ${token('internal:review-decision')}`, 'content-type': 'application/json' };

    expect((await fetch(`${baseUrl}/internal/v1/videos/3/review-decision`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ decisionId: 'decision-reject-reason', decision: 'REJECTED', reason: '画面包含违规内容' }),
    })).status).toBe(200);
    expect(state.videos.find((video) => video.id === '3')).toMatchObject({ status: 'REJECTED', rejectReason: '画面包含违规内容', publishedAt: null });

    expect((await fetch(`${baseUrl}/internal/v1/videos/3/review-decision`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ decisionId: 'decision-approve-publish', decision: 'APPROVED', reason: null }),
    })).status).toBe(200);
    expect(state.videos.find((video) => video.id === '3')?.status).toBe('PUBLISHED');
    expect(state.videos.find((video) => video.id === '3')?.rejectReason).toBeNull();
    expect(state.videos.find((video) => video.id === '3')?.publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('treats review-decision reason changes as idempotency conflicts', async () => {
    const baseUrl = await start({ state: createFixtureState() });
    const headers = { authorization: `Bearer ${token('internal:review-decision')}`, 'content-type': 'application/json' };

    expect(
      (
        await fetch(`${baseUrl}/internal/v1/videos/1/review-decision`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ decisionId: 'decision-reason-conflict', decision: 'HIDDEN', reason: 'policy-a' }),
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await fetch(`${baseUrl}/internal/v1/videos/1/review-decision`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ decisionId: 'decision-reason-conflict', decision: 'HIDDEN', reason: 'policy-b' }),
        })
      ).status,
    ).toBe(409);
  });

  it('rejects review-decision idempotency key reuse for a different target or payload', async () => {
    const baseUrl = await start({ state: createFixtureState() });
    const headers = { authorization: `Bearer ${token('internal:review-decision')}`, 'content-type': 'application/json' };
    const firstBody = JSON.stringify({ decisionId: 'decision-conflict', decision: 'HIDDEN', reason: 'policy' });
    const conflictBody = JSON.stringify({ decisionId: 'decision-conflict', decision: 'APPROVED', reason: 'different' });

    expect((await fetch(`${baseUrl}/internal/v1/videos/1/review-decision`, { method: 'POST', headers, body: firstBody })).status).toBe(200);
    expect((await fetch(`${baseUrl}/internal/v1/videos/2/review-decision`, { method: 'POST', headers, body: conflictBody })).status).toBe(409);
  });

  it('updates comment and danmaku text status through the content boundary', async () => {
    const baseUrl = await start({ state: createFixtureState() });
    const headers = { authorization: `Bearer ${token('internal:text-status')}`, 'content-type': 'application/json' };

    const comment = await json(
      await fetch(`${baseUrl}/internal/v1/videos/1/text-status`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ targetType: 'COMMENT', targetId: 'comment-001', status: 'HIDDEN' }),
      }),
    );
    expect(comment.data).toEqual({ targetType: 'COMMENT', targetId: 'comment-001', status: 'HIDDEN' });

    const danmaku = await json(
      await fetch(`${baseUrl}/internal/v1/videos/1/text-status`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ targetType: 'DANMAKU', targetId: 'danmaku-001', status: 'HIDDEN' }),
      }),
    );
    expect(danmaku.data).toEqual({ targetType: 'DANMAKU', targetId: 'danmaku-001', status: 'HIDDEN' });
  });

  it('returns moderation target snapshots only through the authenticated content boundary', async () => {
    const baseUrl = await start({ state: createFixtureState() });
    const response = await fetch(`${baseUrl}/internal/v1/moderation-targets/COMMENT/comment-001`, {
      headers: { authorization: `Bearer ${token('internal:moderation-target-read')}` },
    });
    expect(response.status).toBe(200);
    expect((await json(response)).data).toMatchObject({ targetType: 'COMMENT', targetId: 'comment-001', videoId: '1', content: 'clear walkthrough' });
    expect((await fetch(`${baseUrl}/internal/v1/moderation-targets/COMMENT/comment-001`, { headers: { 'x-user-id': '1' } })).status).toBe(401);

    const videoResponse = await fetch(`${baseUrl}/internal/v1/moderation-targets/VIDEO/1`, {
      headers: { authorization: `Bearer ${token('internal:moderation-target-read')}` },
    });
    expect((await json(videoResponse)).data).toMatchObject({
      targetType: 'VIDEO',
      targetId: '1',
      title: 'Spring Architecture Notes',
      description: 'A published content fixture for recommendation, search and detail contracts.',
      coverUrl: 'https://cdn.example.test/covers/video-001.jpg',
      playUrl: 'https://cdn.example.test/videos/video-001.mp4',
    });
  });

  it('registers replays idempotently by requestId or objectKey', async () => {
    const baseUrl = await start({ state: createFixtureState() });
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

  it('keeps identical concurrent replay submissions on a single content record', async () => {
    const baseUrl = await start({ state: createFixtureState() });
    const headers = { authorization: `Bearer ${token('internal:replay')}`, 'content-type': 'application/json' };
    const body = JSON.stringify({ requestId: 'replay-request-concurrent', objectKey: 'replays/session-concurrent.webm', mimeType: 'video/webm' });

    const responses = await Promise.all([
      fetch(`${baseUrl}/internal/v1/replays`, { method: 'POST', headers, body }),
      fetch(`${baseUrl}/internal/v1/replays`, { method: 'POST', headers, body }),
    ]);
    const payloads = await Promise.all(responses.map(json));

    expect(responses.map((response) => response.status).sort()).toEqual([200, 201]);
    expect(payloads[0].data).toEqual(payloads[1].data);
  });

  it('rejects replay requestId or objectKey reuse for a different payload', async () => {
    const baseUrl = await start({ state: createFixtureState() });
    const headers = { authorization: `Bearer ${token('internal:replay')}`, 'content-type': 'application/json' };
    const firstBody = JSON.stringify({ requestId: 'replay-request-conflict', objectKey: 'replays/session-conflict.webm', mimeType: 'video/webm' });
    const conflictBody = JSON.stringify({ requestId: 'replay-request-conflict', objectKey: 'replays/other.webm', mimeType: 'video/webm' });
    const objectKeyConflictBody = JSON.stringify({ requestId: 'replay-request-other', objectKey: 'replays/session-conflict.webm', mimeType: 'video/webm' });

    expect((await fetch(`${baseUrl}/internal/v1/replays`, { method: 'POST', headers, body: firstBody })).status).toBe(201);
    expect((await fetch(`${baseUrl}/internal/v1/replays`, { method: 'POST', headers, body: conflictBody })).status).toBe(409);
    expect((await fetch(`${baseUrl}/internal/v1/replays`, { method: 'POST', headers, body: objectKeyConflictBody })).status).toBe(409);
  });

  it('returns video summaries in stable request order with missing IDs preserved', async () => {
    const baseUrl = await start({ state: createFixtureState() });
    const response = await json(
      await fetch(`${baseUrl}/internal/v1/videos/batch-summary`, {
        method: 'POST',
        headers: { authorization: `Bearer ${token('internal:video-summary')}`, 'content-type': 'application/json' },
        body: JSON.stringify({ ids: ['missing', '1'] }),
      }),
    );

    expect(response.data.items).toEqual([
      { id: 'missing', found: false },
      expect.objectContaining({ id: '1', found: true, title: 'Spring Architecture Notes' }),
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
    const removedObjects: string[] = [];
    const result = await createVideoAfterMediaValidation(
      state,
      { filename: 'real.mp4', mimeType: 'video/mp4', bytes: Buffer.from('0000ftypisom') },
      async () => {
        throw new Error('db down');
      },
      acceptsVideo,
      {
        async deleteObject(_bucket, objectKey) {
          removedObjects.push(objectKey);
        },
      },
    );

    expect(result.status).toBe(500);
    expect(state.deletedObjects).toHaveLength(1);
    expect(state.deletedObjects[0]).toMatch(/^uploads\/.+\.mp4$/);
    expect(removedObjects).toEqual(state.deletedObjects);
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
