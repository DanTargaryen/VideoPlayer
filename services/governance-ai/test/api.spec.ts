import { once } from 'node:events';
import type { Server } from 'node:http';

import { issueServiceToken } from '@videoplayer/shared-contracts';
import { afterEach, describe, expect, it } from 'vitest';

import { createGovernanceService } from '../src/service.js';
import type { ContentModerationClient } from '../src/content-client.js';
import { TestGovernanceStore } from './test-store.js';

const SECRET = 'governance-test-secret-contains-more-than-32-characters';
const servers: Server[] = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve()))));
});

const contentClient: ContentModerationClient = {
  async apply() {},
  async getTarget(targetType, targetId) {
    return targetType === 'VIDEO'
      ? { targetType, targetId, videoId: targetId, status: 'PENDING_REVIEW', title: 'Fixture video', description: 'Fixture preview', coverUrl: 'https://cdn.test/cover.jpg', playUrl: 'https://cdn.test/video.mp4', durationSeconds: 42, creatorId: '7' }
      : { targetType, targetId, videoId: '1', status: 'VISIBLE', content: 'fixture text', video: { id: '1', title: 'Fixture video' } };
  },
};

async function start(store = new TestGovernanceStore()) {
  const server = createGovernanceService({ store, jwtSecret: SECRET, contentClient, compensationIntervalMs: false });
  servers.push(server);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Expected TCP address');
  return { baseUrl: `http://127.0.0.1:${address.port}`, store };
}

function gatewayHeaders(requestId: string, role: 'USER' | 'ADMIN' = 'USER') {
  const gatewayToken = issueServiceToken({ caller: 'gateway', audience: 'governance-ai', scopes: ['governance.user.forward'], secret: SECRET, requestId });
  return { authorization: 'Bearer public-session', 'x-gateway-authorization': `Bearer ${gatewayToken}`, 'x-user-id': role === 'ADMIN' ? '9' : '7', 'x-user-nickname': encodeURIComponent(role === 'ADMIN' ? '中文管理员' : '中文用户'), 'x-user-role': role, 'x-request-id': requestId, 'content-type': 'application/json' };
}

function token(requestId: string, scopes: string[], options: { audience?: 'governance-ai' | 'content-media'; now?: number } = {}) {
  return issueServiceToken({
    caller: 'content-media',
    audience: options.audience ?? 'governance-ai',
    scopes,
    secret: SECRET,
    requestId,
    nowSeconds: options.now,
  });
}

async function submit(baseUrl: string, requestId: string, bearer: string) {
  return fetch(`${baseUrl}/internal/v1/reviews`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${bearer}`,
      'content-type': 'application/json',
      'x-request-id': requestId,
    },
    body: JSON.stringify({ requestId, targetType: 'VIDEO', targetId: '501' }),
  });
}

describe('governance internal API', () => {
  it('serves database-aware health and version contracts', async () => {
    const store = new TestGovernanceStore();
    const { baseUrl } = await start(store);
    expect((await fetch(`${baseUrl}/health/live`)).status).toBe(200);
    expect((await fetch(`${baseUrl}/health/ready`)).status).toBe(200);
    expect((await fetch(`${baseUrl}/version`)).status).toBe(200);
    store.isReady = false;
    expect((await fetch(`${baseUrl}/health/ready`)).status).toBe(503);
  });

  it('creates an idempotent review and returns the latest record', async () => {
    const { baseUrl } = await start();
    const requestId = 'api-review-1';
    const first = await submit(baseUrl, requestId, token(requestId, ['governance.reviews.write']));
    const repeated = await submit(baseUrl, requestId, token(requestId, ['governance.reviews.write']));
    expect(first.status).toBe(200);
    expect((await first.json()).data.id).toBe((await repeated.json()).data.id);

    const readRequestId = 'api-review-read-1';
    const latest = await fetch(`${baseUrl}/internal/v1/reviews/VIDEO/501/latest`, {
      headers: {
        authorization: `Bearer ${token(readRequestId, ['governance.reviews.read'])}`,
        'x-request-id': readRequestId,
      },
    });
    expect(latest.status).toBe(200);
    expect(await latest.json()).toMatchObject({ code: 0, requestId: readRequestId, data: { targetId: '501' } });
  });

  it('rejects expired, wrong-audience, missing-scope and mismatched-requestId tokens', async () => {
    const { baseUrl } = await start();
    const now = Math.floor(Date.now() / 1000);
    const cases = [
      token('expired', ['governance.reviews.write'], { now: now - 120 }),
      token('wrong-audience', ['governance.reviews.write'], { audience: 'content-media' }),
      token('missing-scope', ['governance.reviews.read']),
      token('different-request-id', ['governance.reviews.write']),
    ];
    for (const [index, bearer] of cases.entries()) {
      const response = await submit(baseUrl, `jwt-case-${index}`, bearer);
      expect(response.status).toBe(401);
      expect((await response.json()).code).toBe(401);
    }
  });
});

describe('governance public workflow', () => {
  it('rejects forged identity and non-admin access', async () => {
    const { baseUrl } = await start();
    expect((await fetch(`${baseUrl}/api/v1/admin/reports`, { headers: { 'x-user-id': '9', 'x-user-role': 'ADMIN' } })).status).toBe(401);
    expect((await fetch(`${baseUrl}/api/v1/admin/reports`, { headers: gatewayHeaders('not-admin') })).status).toBe(403);
  });

  it('submits, lists, handles, applies and deletes a report', async () => {
    const { baseUrl } = await start();
    const submitted = await fetch(`${baseUrl}/api/v1/reports`, { method: 'POST', headers: gatewayHeaders('report-create-1'), body: JSON.stringify({ targetType: 'COMMENT', targetId: 'comment-001', reason: '恶意内容' }) });
    expect(submitted.status).toBe(200);
    const reportId = (await submitted.json()).data.id as number;
    const listed = await fetch(`${baseUrl}/api/v1/admin/reports`, { headers: gatewayHeaders('report-list-1', 'ADMIN') });
    expect((await listed.json()).data[0]).toMatchObject({ id: reportId, status: 'PENDING', comment: { content: 'fixture text' } });
    const handled = await fetch(`${baseUrl}/api/v1/admin/reports/${reportId}`, { method: 'POST', headers: gatewayHeaders('report-handle-1', 'ADMIN'), body: JSON.stringify({ action: 'DELETE', reason: '确认违规' }) });
    expect(handled.status).toBe(200);
    expect((await handled.json()).data.decision.applyStatus).toBe('APPLIED');
    expect((await fetch(`${baseUrl}/api/v1/admin/reports/${reportId}`, { method: 'DELETE', headers: gatewayHeaders('report-delete-1', 'ADMIN') })).status).toBe(200);
  });

  it('reviews queued video and exposes dashboard and local agent preview', async () => {
    const { baseUrl } = await start();
    await submit(baseUrl, 'public-review-seed', token('public-review-seed', ['governance.reviews.write']));
    const queue = await fetch(`${baseUrl}/api/v1/admin/reviews/videos`, { headers: gatewayHeaders('review-list-1', 'ADMIN') });
    const queueItem = (await queue.json()).data[0];
    expect(queueItem).toMatchObject({ targetId: '501', video: { title: 'Fixture video', description: 'Fixture preview', coverUrl: 'https://cdn.test/cover.jpg', playUrl: 'https://cdn.test/video.mp4' } });
    const reviewId = queueItem.id as number;
    const reviewed = await fetch(`${baseUrl}/api/v1/admin/reviews/videos/${reviewId}`, { method: 'POST', headers: gatewayHeaders('review-decide-1', 'ADMIN'), body: JSON.stringify({ action: 'APPROVE' }) });
    expect((await reviewed.json()).data).toMatchObject({ status: 'APPROVED', applyStatus: 'APPLIED' });
    expect((await fetch(`${baseUrl}/api/v1/admin/dashboard`, { headers: gatewayHeaders('dashboard-1', 'ADMIN') })).status).toBe(200);
    const preview = await fetch(`${baseUrl}/api/v1/agent/review-preview`, { method: 'POST', headers: gatewayHeaders('agent-1', 'ADMIN'), body: JSON.stringify({ targetType: 'COMMENT', content: '这是诈骗内容' }) });
    expect((await preview.json()).data).toMatchObject({ riskLevel: 'HIGH', suggestedAction: 'REJECT', mode: 'RULES_ONLY' });
  });
});
