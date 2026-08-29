import { once } from 'node:events';
import { createServer, type Server } from 'node:http';

import { afterEach, describe, expect, it } from 'vitest';

import { ContentApplyError, HttpContentModerationClient } from '../src/content-client.js';
import type { ReviewRecord } from '../src/types.js';

const secret = 'content-client-contract-secret-at-least-32-characters';
const servers: Server[] = [];
const decision: ReviewRecord = {
  id: 1,
  decisionId: 'decision-http-1',
  requestId: 'handle-http-1',
  targetType: 'VIDEO',
  targetId: '1',
  videoId: '1',
  decision: 'DELETE',
  applyStatus: 'APPLY_PENDING',
  attempts: 0,
  lastError: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve()))));
});

async function endpoint(status: number, delayMs = 0) {
  const server = createServer((_request, response) => {
    setTimeout(() => {
      response.writeHead(status, { 'content-type': 'application/json' });
      response.end('{}');
    }, delayMs);
  });
  servers.push(server);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Expected TCP address');
  return `http://127.0.0.1:${address.port}`;
}

describe('content moderation HTTP failure contract', () => {
  it('treats KEEP as a true no-op for content state', async () => {
    const client = new HttpContentModerationClient({ baseUrl: 'http://127.0.0.1:1', jwtSecret: secret, timeoutMs: 5 });
    await expect(client.apply({ ...decision, decision: 'KEEP' })).resolves.toBeUndefined();
  });

  it.each([502, 503])('classifies HTTP %i as retryable', async (status) => {
    const client = new HttpContentModerationClient({ baseUrl: await endpoint(status), jwtSecret: secret });
    await expect(client.apply(decision)).rejects.toMatchObject<Partial<ContentApplyError>>({ retryable: true, status });
  });

  it('classifies timeouts as retryable', async () => {
    const client = new HttpContentModerationClient({ baseUrl: await endpoint(200, 100), jwtSecret: secret, timeoutMs: 5 });
    await expect(client.apply(decision)).rejects.toMatchObject<Partial<ContentApplyError>>({ retryable: true });
  });

  it.each([400, 401, 409])('classifies HTTP %i as final', async (status) => {
    const client = new HttpContentModerationClient({ baseUrl: await endpoint(status), jwtSecret: secret });
    await expect(client.apply(decision)).rejects.toMatchObject<Partial<ContentApplyError>>({ retryable: false, status });
  });
});
