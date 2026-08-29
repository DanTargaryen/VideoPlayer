import { once } from 'node:events';
import type { Server } from 'node:http';

import {
  assertApiResponse,
  assertContentReplay,
  assertIdentityBatchSummary,
  issueServiceToken,
} from '@videoplayer/shared-contracts';
import { afterEach, describe, expect, it } from 'vitest';

import { createContentService, createFixtureState } from '../../content-media/src/service.js';
import { IdentityStore } from '../../identity-community/src/identity-store.js';
import { createIdentityService } from '../../identity-community/src/service.js';

const secret = 'cross-service-contract-secret-at-least-32-characters';
const servers: Server[] = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve()))));
});

async function listen(server: Server): Promise<string> {
  servers.push(server);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Expected TCP address');
  return `http://127.0.0.1:${address.port}`;
}

function authorization(audience: 'identity-community' | 'content-media', scope: string, requestId: string) {
  const token = issueServiceToken({
    caller: 'governance-ai',
    audience,
    scopes: [scope],
    secret,
    requestId,
  });
  return { authorization: `Bearer ${token}`, 'content-type': 'application/json', 'x-request-id': requestId };
}

async function body(response: Response) {
  const value: unknown = await response.json();
  assertApiResponse(value);
  return value;
}

describe('E cross-service contracts against current service implementations', () => {
  it('validates identity batch-summary and notification idempotency', async () => {
    const baseUrl = await listen(createIdentityService({
      store: new IdentityStore(true, 'contract-admin-secret'),
      serviceJwtSecret: secret,
    }));
    const summaryResponse = await fetch(`${baseUrl}/internal/v1/users/batch-summary`, {
      method: 'POST',
      headers: authorization('identity-community', 'internal:user-summary', 'contract-summary-1'),
      body: JSON.stringify({ userIds: [2, 999, 3] }),
    });
    expect(summaryResponse.status).toBe(200);
    const summaryEnvelope = await body(summaryResponse);
    assertIdentityBatchSummary(summaryEnvelope.data);
    expect(summaryEnvelope.data.missingIds).toEqual([999]);

    const notificationPayload = {
      recipientId: 2,
      actorId: 3,
      type: 'SYSTEM',
      title: '治理结果',
      content: '举报处置已完成',
      relatedType: 'REPORT',
      relatedId: 1,
    };
    const request = () => fetch(`${baseUrl}/internal/v1/notifications`, {
      method: 'POST',
      headers: authorization('identity-community', 'internal:notification-write', 'contract-notification-1'),
      body: JSON.stringify(notificationPayload),
    });
    const first = await body(await request());
    const repeated = await body(await request());
    expect((first.data as { id: number }).id).toBe((repeated.data as { id: number }).id);
  });

  it('validates content review, text status and replay idempotency contracts', async () => {
    const baseUrl = await listen(createContentService({ state: createFixtureState(), internalJwtSecret: secret }));
    const reviewPayload = { decisionId: 'contract-decision-1', decision: 'HIDDEN', reason: 'policy' };
    const review = () => fetch(`${baseUrl}/internal/v1/videos/1/review-decision`, {
      method: 'POST',
      headers: authorization('content-media', 'internal:review-decision', 'contract-review-1'),
      body: JSON.stringify(reviewPayload),
    });
    const firstReview = await body(await review());
    const replayedReview = await body(await review());
    expect(firstReview.data).toEqual(replayedReview.data);

    const text = await body(await fetch(`${baseUrl}/internal/v1/videos/1/text-status`, {
      method: 'POST',
      headers: authorization('content-media', 'internal:text-status', 'contract-text-1'),
      body: JSON.stringify({ targetType: 'COMMENT', targetId: 'comment-001', status: 'HIDDEN' }),
    }));
    expect(text.data).toMatchObject({ targetType: 'COMMENT', targetId: 'comment-001', status: 'HIDDEN' });

    const replayPayload = {
      requestId: 'contract-replay-1',
      objectKey: 'replays/contract-1.webm',
      mimeType: 'video/webm',
      title: 'Contract replay',
      creatorId: '2',
    };
    const register = () => fetch(`${baseUrl}/internal/v1/replays`, {
      method: 'POST',
      headers: authorization('content-media', 'internal:replay', 'contract-replay-1'),
      body: JSON.stringify(replayPayload),
    });
    const firstReplay = await body(await register());
    const repeatedReplay = await body(await register());
    assertContentReplay(firstReplay.data);
    expect(firstReplay.data).toEqual(repeatedReplay.data);
  });

  it('keeps content reads explainable when identity summary times out', async () => {
    const baseUrl = await listen(createContentService({
      state: createFixtureState(),
      internalJwtSecret: secret,
      identityTimeoutMs: 5,
      identityClient: { async batchSummary() { return new Promise(() => undefined); } },
    }));
    const response = await body(await fetch(`${baseUrl}/api/v1/feeds/recommend`));
    expect((response.data as Array<{ creator: { nickname: string } }>)[0]?.creator.nickname)
      .toBe('用户信息暂不可用');
  });
});
