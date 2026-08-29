import { once } from 'node:events';
import { createServer } from 'node:http';

import { verifyServiceToken } from '@videoplayer/shared-contracts';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ModerationSideEffectClient } from '../src/identity-client.js';
import type { ReviewRecord } from '../src/types.js';

const SECRET = 'identity-client-test-secret-with-32-characters';
const servers: ReturnType<typeof createServer>[] = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve()))));
});

describe('governance side-effect client', () => {
  it('applies content first and writes an idempotent REPORT notification', async () => {
    let received: Record<string, unknown> | undefined;
    const server = createServer(async (request, response) => {
      const token = String(request.headers.authorization).replace(/^Bearer\s+/i, '');
      const claims = verifyServiceToken(token, { audience: 'identity-community', secret: SECRET, requiredScopes: ['internal:notification-write'], allowedCallers: ['governance-ai'] });
      expect(claims.requestId).toBe('decision-1:notification');
      const chunks: Buffer[] = [];
      for await (const chunk of request) chunks.push(Buffer.from(chunk));
      received = JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>;
      response.end('{}');
    });
    servers.push(server);
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Expected TCP address');
    const apply = vi.fn(async () => undefined);
    const client = new ModerationSideEffectClient({ apply }, `http://127.0.0.1:${address.port}`, SECRET);
    const decision: ReviewRecord = { id: 1, decisionId: 'decision-1', requestId: 'request-1', targetType: 'VIDEO', targetId: '1', videoId: '1', reportId: 8, notificationRecipientId: 7, decision: 'DELETE', reason: null, operatorId: 9, applyStatus: 'APPLY_PENDING', attempts: 0, lastError: null, createdAt: new Date(), updatedAt: new Date() };
    await client.apply(decision);
    expect(apply).toHaveBeenCalledOnce();
    expect(received).toMatchObject({ recipientId: 7, actorId: 9, type: 'REPORT', relatedType: 'REPORT', relatedId: 8 });
  });
});
