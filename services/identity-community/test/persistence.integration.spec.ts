import { once } from 'node:events';

import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { issueServiceToken } from '@videoplayer/shared-contracts';

import { createIdentityService } from '../src/service.js';

const databaseUrl = process.env.IDENTITY_TEST_DATABASE_URL?.trim() ?? '';
const adminSecret = 'identity-integration-admin-secret';
const serviceJwtSecret = 'identity-integration-service-secret-at-least-32-chars';
const servers: ReturnType<typeof createIdentityService>[] = [];
let prisma: PrismaClient;

function assertSafeTestDatabase() {
  const parsed = new URL(databaseUrl);
  const databaseName = parsed.pathname.replace(/^\//, '').toLowerCase();
  const localHost = parsed.hostname === 'localhost'
    || parsed.hostname === '127.0.0.1'
    || parsed.hostname.startsWith('127.');
  if (!localHost || !databaseName.includes('test')) {
    throw new Error('IDENTITY_TEST_DATABASE_URL must target a local database whose name contains test');
  }
}

async function resetDatabase() {
  await prisma.$transaction([
    prisma.dynamicPostComment.deleteMany(),
    prisma.dynamicPostLike.deleteMany(),
    prisma.dynamicPost.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.directMessage.deleteMany(),
    prisma.followRelation.deleteMany(),
    prisma.userProfileSummary.deleteMany(),
    prisma.userCreatorPreference.deleteMany(),
    prisma.userCategoryPreference.deleteMany(),
    prisma.creatorFollowerDaily.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

async function startService() {
  const server = createIdentityService({
    databaseUrl,
    adminSecret,
    serviceJwtSecret,
  });
  servers.push(server);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Expected a TCP address');
  const baseUrl = `http://127.0.0.1:${address.port}`;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const response = await fetch(`${baseUrl}/health/ready`);
    if (response.ok) return { server, baseUrl };
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('identity-community did not become ready');
}

async function closeService(server: ReturnType<typeof createIdentityService>) {
  const index = servers.indexOf(server);
  if (index >= 0) servers.splice(index, 1);
  await new Promise<void>((resolve) => server.close(() => resolve()));
}

async function requestJson(baseUrl: string, path: string, init: RequestInit = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { 'content-type': 'application/json', ...(init.headers ?? {}) },
    ...init,
  });
  const text = await response.text();
  return {
    response,
    json: text ? JSON.parse(text) as { data: Record<string, unknown> } : null,
  };
}

beforeAll(async () => {
  if (!databaseUrl) throw new Error('IDENTITY_TEST_DATABASE_URL is required');
  assertSafeTestDatabase();
  prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  await prisma.$connect();
  await resetDatabase();
});

afterAll(async () => {
  await Promise.all(servers.splice(0).map((server) => closeService(server)));
  if (prisma) {
    await resetDatabase();
    await prisma.$disconnect();
  }
});

describe('identity-community Prisma persistence', () => {
  it('persists UC01/UC04 state across restarts and enforces cross-instance notification idempotency', async () => {
    const first = await startService();
    const aliceRegister = await requestJson(first.baseUrl, '/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username: 'persist_alice', password: 'Alice123456!', email: 'persist-alice@example.com' }),
    });
    const bobRegister = await requestJson(first.baseUrl, '/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username: 'persist_bob', password: 'Bob123456!', email: 'persist-bob@example.com' }),
    });
    const aliceId = Number(aliceRegister.json?.data.id);
    const bobId = Number(bobRegister.json?.data.id);
    expect(aliceRegister.response.status).toBe(200);
    expect(bobRegister.response.status).toBe(200);

    const firstLogin = await requestJson(first.baseUrl, '/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ account: 'persist_alice', password: 'Alice123456!' }),
    });
    const firstToken = String(firstLogin.json?.data.token);
    const follow = await requestJson(first.baseUrl, `/api/v1/users/${bobId}/follow`, {
      method: 'POST',
      headers: { authorization: `Bearer ${firstToken}` },
    });
    expect(follow.response.status).toBe(200);
    await closeService(first.server);

    const second = await startService();
    const secondLogin = await requestJson(second.baseUrl, '/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ account: 'persist_alice', password: 'Alice123456!' }),
    });
    expect(secondLogin.response.status).toBe(200);
    const staleSession = await requestJson(second.baseUrl, '/api/v1/auth/me', {
      headers: { authorization: `Bearer ${firstToken}` },
    });
    expect(staleSession.response.status).toBe(401);
    const followers = await requestJson(second.baseUrl, `/api/v1/users/${bobId}/followers`);
    expect(followers.response.status).toBe(200);
    expect((followers.json?.data as unknown as Array<{ id: number }>).map(({ id }) => id)).toContain(aliceId);

    const third = await startService();
    const requestId = 'integration-notification-concurrent';
    const notificationToken = issueServiceToken({
      caller: 'content-media',
      audience: 'identity-community',
      scopes: ['internal:notification-write'],
      secret: serviceJwtSecret,
      requestId,
    });
    const payload = {
      recipientId: bobId,
      actorId: aliceId,
      type: 'FOLLOW',
      title: '持久化通知',
      content: '跨实例并发请求只创建一条通知',
      relatedType: 'USER',
      relatedId: aliceId,
    };
    const [left, right] = await Promise.all([
      requestJson(second.baseUrl, '/internal/v1/notifications', {
        method: 'POST',
        headers: { authorization: `Bearer ${notificationToken}` },
        body: JSON.stringify(payload),
      }),
      requestJson(third.baseUrl, '/internal/v1/notifications', {
        method: 'POST',
        headers: { authorization: `Bearer ${notificationToken}` },
        body: JSON.stringify(payload),
      }),
    ]);
    expect(left.response.status).toBe(200);
    expect(right.response.status).toBe(200);
    expect(left.json?.data.id).toBe(right.json?.data.id);
    expect(await prisma.notification.count({ where: { requestId } })).toBe(1);

    const conflict = await requestJson(third.baseUrl, '/internal/v1/notifications', {
      method: 'POST',
      headers: { authorization: `Bearer ${notificationToken}` },
      body: JSON.stringify({ ...payload, title: '冲突载荷' }),
    });
    expect(conflict.response.status).toBe(409);
  }, 30_000);
});
