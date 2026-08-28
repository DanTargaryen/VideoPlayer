import { once } from 'node:events';

import { afterEach, describe, expect, it } from 'vitest';

import { issueServiceToken } from '@videoplayer/shared-contracts';

import { createIdentityService } from '../src/service.js';

const secret = 'identity-community-test-secret-with-at-least-32-chars';
const servers: ReturnType<typeof createIdentityService>[] = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve()))));
});

async function startService() {
  const server = createIdentityService({ serviceJwtSecret: secret });
  servers.push(server);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Expected TCP address');
  }
  const baseUrl = `http://127.0.0.1:${address.port}`;
  return { server, baseUrl };
}

async function requestJson(
  baseUrl: string,
  path: string,
  init: RequestInit = {},
) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      'content-type': 'application/json',
      ...(init.headers ?? {}),
    },
    ...init,
  });
  const text = await response.text();
  return {
    response,
    json: text ? JSON.parse(text) as { code: number; message: string; data: unknown; requestId: string } : null,
  };
}

function authHeader(token: string) {
  return { authorization: `Bearer ${token}` };
}

describe('identity-community service', () => {
  it('serves health/version and a usable auth/profile flow', async () => {
    const { baseUrl } = await startService();

    const live = await requestJson(baseUrl, '/health/live');
    expect(live.response.status).toBe(200);
    expect((live.json?.data as { service: string }).service).toBe('identity-community');

    const ready = await requestJson(baseUrl, '/health/ready');
    expect(ready.response.status).toBe(200);

    const version = await requestJson(baseUrl, '/version');
    expect(version.response.status).toBe(200);

    const register = await requestJson(baseUrl, '/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        username: 'lzy',
        password: 'Lzy123456!',
        nickname: 'LZY',
        email: 'lzy@example.com',
      }),
    });
    expect(register.response.status).toBe(200);
    expect((register.json?.data as { username: string }).username).toBe('lzy');

    const duplicateRegister = await requestJson(baseUrl, '/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        username: 'lzy',
        password: 'Lzy123456!',
        nickname: 'LZY2',
        email: 'lzy2@example.com',
      }),
    });
    expect(duplicateRegister.response.status).toBe(409);

    const badLogin = await requestJson(baseUrl, '/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ account: 'lzy', password: 'wrong' }),
    });
    expect(badLogin.response.status).toBe(401);

    const unknownAccount = await requestJson(baseUrl, '/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ account: 'ghost_user', password: 'Lzy123456!' }),
    });
    expect(unknownAccount.response.status).toBe(401);

    const login = await requestJson(baseUrl, '/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ account: 'lzy', password: 'Lzy123456!' }),
    });
    expect(login.response.status).toBe(200);
    const loginToken = (login.json?.data as { token: string }).token;

    const me = await requestJson(baseUrl, '/api/v1/auth/me', {
      headers: authHeader(loginToken),
    });
    expect(me.response.status).toBe(200);
    expect((me.json?.data as { nickname: string }).nickname).toBe('LZY');
    expect((me.json?.data as { email: string }).email).toBe('lzy@example.com');

    const adminLoginMissingSecret = await requestJson(baseUrl, '/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ account: 'demo_admin', password: 'Admin123456!' }),
    });
    expect(adminLoginMissingSecret.response.status).toBe(401);

    const adminLoginWrongSecret = await requestJson(baseUrl, '/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ account: 'demo_admin', password: 'Admin123456!', adminSecret: 'bad-secret' }),
    });
    expect(adminLoginWrongSecret.response.status).toBe(401);

    const adminLogin = await requestJson(baseUrl, '/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ account: 'demo_admin', password: 'Admin123456!', adminSecret: '123456' }),
    });
    expect(adminLogin.response.status).toBe(200);

    const profileUpdate = await requestJson(baseUrl, '/api/v1/users/profile', {
      method: 'PUT',
      headers: authHeader(loginToken),
      body: JSON.stringify({
        nickname: 'LZY-Updated',
        bio: 'identity service flow is alive',
      }),
    });
    expect(profileUpdate.response.status).toBe(200);
    expect((profileUpdate.json?.data as { nickname: string }).nickname).toBe('LZY-Updated');

    const relogin = await requestJson(baseUrl, '/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ account: 'lzy', password: 'Lzy123456!' }),
    });
    const freshToken = (relogin.json?.data as { token: string }).token;
    const staleMe = await requestJson(baseUrl, '/api/v1/auth/me', {
      headers: authHeader(loginToken),
    });
    expect(staleMe.response.status).toBe(401);
    const freshMe = await requestJson(baseUrl, '/api/v1/auth/me', {
      headers: authHeader(freshToken),
    });
    expect(freshMe.response.status).toBe(200);
  });

  it('keeps follow, notification, message and homepage flows consistent', async () => {
    const { baseUrl } = await startService();

    const bobLogin = await requestJson(baseUrl, '/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ account: 'viewer_bob', password: 'Bob123456!' }),
    });
    const bobToken = (bobLogin.json?.data as { token: string }).token;
    const carolLogin = await requestJson(baseUrl, '/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ account: 'creator_carol', password: 'Carol123456!' }),
    });
    const carolToken = (carolLogin.json?.data as { token: string }).token;

    const homepage = await requestJson(baseUrl, '/api/v1/users/2/homepage', {
      headers: authHeader(bobToken),
    });
    expect(homepage.response.status).toBe(200);
    expect((homepage.json?.data as { isFollowing: boolean }).isFollowing).toBe(true);

    const follow = await requestJson(baseUrl, '/api/v1/users/4/follow', {
      method: 'POST',
      headers: authHeader(bobToken),
    });
    expect(follow.response.status).toBe(200);
    expect((follow.json?.data as { followed: boolean }).followed).toBe(true);

    const repeatFollow = await requestJson(baseUrl, '/api/v1/users/4/follow', {
      method: 'POST',
      headers: authHeader(bobToken),
    });
    expect((repeatFollow.json?.data as { followerCount: number }).followerCount).toBe(
      (follow.json?.data as { followerCount: number }).followerCount,
    );

    const notifications = await requestJson(baseUrl, '/api/v1/notifications', {
      headers: authHeader(carolToken),
    });
    expect(notifications.response.status).toBe(200);
    const notificationItems = notifications.json?.data as Array<{ actor: { nickname: string } | null }>;
    expect(notificationItems.some((item) => item.actor?.nickname === 'Bob')).toBe(true);

    const unreadCount = await requestJson(baseUrl, '/api/v1/notifications/unread-count', {
      headers: authHeader(carolToken),
    });
    expect((unreadCount.json?.data as { unreadCount: number }).unreadCount).toBeGreaterThan(0);

    const readAll = await requestJson(baseUrl, '/api/v1/notifications/read-all', {
      method: 'POST',
      headers: authHeader(carolToken),
    });
    expect((readAll.json?.data as { success: boolean }).success).toBe(true);

    const dm = await requestJson(baseUrl, '/api/v1/messages/conversations/4', {
      method: 'POST',
      headers: authHeader(bobToken),
      body: JSON.stringify({ content: '你好，想确认一下社区页是否可用。' }),
    });
    expect(dm.response.status).toBe(200);
    expect((dm.json?.data as { message: { content: string } }).message.content).toContain('社区页');

    const dmUnread = await requestJson(baseUrl, '/api/v1/messages/unread-count', {
      headers: authHeader(carolToken),
    });
    expect((dmUnread.json?.data as { unreadCount: number }).unreadCount).toBeGreaterThan(0);

    const feedPost = await requestJson(baseUrl, '/api/v1/feed/posts', {
      method: 'POST',
      headers: authHeader(bobToken),
      body: JSON.stringify({
        content: '新的动态已经发布。',
        images: ['https://example.com/identity-post.jpg'],
      }),
    });
    expect(feedPost.response.status).toBe(200);

    const feed = await requestJson(baseUrl, '/api/v1/feed/dynamic?page=1&pageSize=10', {
      headers: authHeader(bobToken),
    });
    expect(feed.response.status).toBe(200);
    expect(((feed.json?.data as { list: Array<{ description: string }> }).list).some((item) => item.description.includes('新的动态'))).toBe(true);
  });

  it('supports internal batch summary, exists and idempotent notifications', async () => {
    const { baseUrl } = await startService();

    const summaryToken = issueServiceToken({
      caller: 'content-media',
      audience: 'identity-community',
      scopes: ['internal:user-summary'],
      secret,
      requestId: 'summary-request',
    });

    const summary = await requestJson(baseUrl, '/internal/v1/users/batch-summary', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${summaryToken}`,
      },
      body: JSON.stringify({ userIds: [2, 999, 3] }),
    });
    expect(summary.response.status).toBe(200);
    expect((summary.json?.data as { requestedIds: number[] }).requestedIds).toEqual([2, 999, 3]);
    expect((summary.json?.data as { missingIds: number[] }).missingIds).toEqual([999]);
    const summaryItems = (summary.json?.data as { items: Array<{ id: number; nickname: string; avatarUrl: string | null }> }).items;
    expect(summaryItems.every((item) => Object.keys(item).sort().join(',') === 'avatarUrl,id,nickname')).toBe(true);

    const existsToken = issueServiceToken({
      caller: 'gateway',
      audience: 'identity-community',
      scopes: ['internal:user-exists'],
      secret,
      requestId: 'exists-request',
    });
    const exists = await requestJson(baseUrl, '/internal/v1/users/2/exists', {
      headers: {
        authorization: `Bearer ${existsToken}`,
      },
    });
    expect((exists.json?.data as { exists: boolean }).exists).toBe(true);

    const notificationToken = issueServiceToken({
      caller: 'governance-ai',
      audience: 'identity-community',
      scopes: ['internal:notification-write'],
      secret,
      requestId: 'notification-request',
    });
    const payload = {
      recipientId: 2,
      actorId: 3,
      type: 'SYSTEM',
      title: '系统通知',
      content: '内部接口已完成幂等创建。',
      relatedType: 'SYSTEM',
      relatedId: 1,
    };
    const first = await requestJson(baseUrl, '/internal/v1/notifications', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${notificationToken}`,
      },
      body: JSON.stringify(payload),
    });
    const second = await requestJson(baseUrl, '/internal/v1/notifications', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${notificationToken}`,
      },
      body: JSON.stringify(payload),
    });
    expect((first.json?.data as { id: number }).id).toBe((second.json?.data as { id: number }).id);

    const conflictToken = issueServiceToken({
      caller: 'governance-ai',
      audience: 'identity-community',
      scopes: ['internal:notification-write'],
      secret,
      requestId: 'notification-request',
    });
    const conflict = await requestJson(baseUrl, '/internal/v1/notifications', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${conflictToken}`,
      },
      body: JSON.stringify({
        ...payload,
        title: 'different title',
      }),
    });
    expect(conflict.response.status).toBe(409);
  });
});
