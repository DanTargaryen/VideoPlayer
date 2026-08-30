import { once } from 'node:events';
import { createServer, type Server } from 'node:http';

import { verifyServiceToken } from '@videoplayer/shared-contracts';
import { afterEach, describe, expect, it } from 'vitest';

import { HttpIdentityNotificationClient, IdentityNotificationError } from '../src/notification-client.js';

const secret = 'content-notification-test-secret-0123456789';
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

describe('content identity notification client', () => {
  it('sends an idempotent service JWT and compatible identity payload', async () => {
    let captured: Record<string, unknown> | null = null;
    const baseUrl = await listen(createServer(async (request, response) => {
      const token = String(request.headers.authorization).replace(/^Bearer\s+/i, '');
      const claims = verifyServiceToken(token, {
        audience: 'identity-community',
        secret,
        requiredScopes: ['internal:notification-write'],
        allowedCallers: ['content-media'],
      });
      const chunks: Buffer[] = [];
      for await (const chunk of request) chunks.push(Buffer.from(chunk));
      captured = JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>;
      expect(claims.requestId).toBe('content-notification-1');
      expect(request.headers['x-request-id']).toBe(claims.requestId);
      response.statusCode = 200;
      response.end('{}');
    }));
    const client = new HttpIdentityNotificationClient(baseUrl, secret, 500);
    await client.deliver({
      requestId: 'content-notification-1',
      recipientId: '1',
      actorId: '2',
      type: 'LIKE',
      title: '收到新的点赞',
      content: '用户 2 点赞了你的视频',
      relatedType: 'VIDEO',
      relatedId: '3',
    });
    expect(captured).toMatchObject({ recipientId: 1, actorId: 2, type: 'LIKE', relatedType: 'VIDEO', relatedId: 3 });
  });

  it('classifies identity 503 as retryable and identity 400 as final', async () => {
    let status = 503;
    const baseUrl = await listen(createServer((_request, response) => {
      response.statusCode = status;
      response.end('{}');
    }));
    const client = new HttpIdentityNotificationClient(baseUrl, secret, 500);
    const notification = {
      requestId: 'content-notification-failure',
      recipientId: '1',
      actorId: '2',
      type: 'COMMENT' as const,
      title: '收到新的评论',
      content: '评论',
      relatedType: 'VIDEO' as const,
      relatedId: '3',
    };
    await expect(client.deliver(notification)).rejects.toMatchObject<IdentityNotificationError>({ retryable: true, status: 503 });
    status = 400;
    await expect(client.deliver(notification)).rejects.toMatchObject<IdentityNotificationError>({ retryable: false, status: 400 });
  });
});
