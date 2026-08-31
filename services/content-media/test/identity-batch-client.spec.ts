import { once } from 'node:events';
import { createServer, type Server } from 'node:http';

import { verifyServiceToken } from '@videoplayer/shared-contracts';
import { afterEach, describe, expect, it } from 'vitest';

import { HttpIdentityBatchClient } from '../src/service.js';

const secret = 'content-identity-batch-secret-0123456789';
const servers: Server[] = [];

async function listen(server: Server) {
  servers.push(server);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Expected TCP address');
  return `http://127.0.0.1:${address.port}`;
}

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve()))));
});

describe('content identity batch client', () => {
  it('uses the internal summary scope and converts numeric wire IDs to content external IDs', async () => {
    const baseUrl = await listen(createServer(async (request, response) => {
      const token = String(request.headers.authorization).replace(/^Bearer\s+/i, '');
      const claims = verifyServiceToken(token, {
        audience: 'identity-community',
        secret,
        requiredScopes: ['internal:user-summary'],
        allowedCallers: ['content-media'],
      });
      const chunks: Buffer[] = [];
      for await (const chunk of request) chunks.push(Buffer.from(chunk));
      expect(JSON.parse(Buffer.concat(chunks).toString('utf8'))).toEqual({ userIds: ['1', '2'] });
      expect(claims.requestId).toBe('identity-batch-request');
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify({
        code: 0,
        message: 'ok',
        requestId: claims.requestId,
        data: { items: [{ id: 1, nickname: '用户一', avatarUrl: null }, { id: 2, nickname: '用户二', avatarUrl: 'https://cdn.example.test/2.png' }] },
      }));
    }));
    const result = await new HttpIdentityBatchClient(baseUrl, secret, 500).batchSummary(['1', '2'], 'identity-batch-request');
    expect(result.get('1')).toEqual({ id: '1', nickname: '用户一', avatarUrl: null });
    expect(result.get('2')).toEqual({ id: '2', nickname: '用户二', avatarUrl: 'https://cdn.example.test/2.png' });
  });

  it('fails closed so the caller can apply the documented summary fallback', async () => {
    const baseUrl = await listen(createServer((_request, response) => {
      response.statusCode = 503;
      response.end('{}');
    }));
    await expect(new HttpIdentityBatchClient(baseUrl, secret, 500).batchSummary(['1'], 'identity-batch-failure'))
      .rejects.toThrow('identity batch summary returned 503');
  });

  it('reads identity-owned creator profile and follower trend', async () => {
    const baseUrl = await listen(createServer((request, response) => {
      expect(request.url).toBe('/internal/v1/users/7/creator-stats');
      const token = String(request.headers.authorization).replace(/^Bearer\s+/i, '');
      const claims = verifyServiceToken(token, { audience: 'identity-community', secret, requiredScopes: ['internal:user-summary'], allowedCallers: ['content-media'] });
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify({ requestId: claims.requestId, data: { user: { id: 7, username: 'creator', nickname: '创作者', avatarUrl: null, bio: 'bio', email: 'creator@example.com', messagePrivacy: 'ALLOW_ALL', role: 'USER', createdAt: '2026-08-31T00:00:00.000Z' }, followerCount: 5, followingCount: 2, followerTrend: [{ date: '2026-08-31', followerCount: 5 }] } }));
    }));
    const stats = await new HttpIdentityBatchClient(baseUrl, secret, 500).creatorStats('7', 'creator-stats-client');
    expect(stats).toMatchObject({ user: { id: 7, username: 'creator' }, followerCount: 5, followingCount: 2, followerTrend: [{ followerCount: 5 }] });
  });
});
