import assert from 'node:assert/strict';

const [mode, baseUrl] = process.argv.slice(2);
if (!['read', 'identity-write', 'rollback'].includes(mode) || !baseUrl) {
  throw new Error('Usage: node scripts/read-cutover-probe.mjs <read|identity-write|rollback> <gateway-base-url>');
}

async function probe(path, owner, init = {}) {
  const requestId = `cutover-${owner}-${Math.random().toString(16).slice(2)}`;
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { 'x-request-id': requestId, ...(init.headers ?? {}) },
  });
  assert.equal(response.status, 200, `${path} returned ${response.status}`);
  assert.equal(response.headers.get('x-gateway-upstream'), owner, `${path} used the wrong upstream`);
  assert.equal(response.headers.get('x-request-id'), requestId, `${path} lost its requestId`);
  const payload = await response.json();
  if (owner === 'monolith') assert.equal(payload.owner, 'monolith');
  return payload;
}

const version = await fetch(`${baseUrl}/version`).then((response) => response.json());
if (mode === 'read') {
  assert.equal(version.data.routeMode, 'services');
  assert.deepEqual(version.data.readCutover, ['identity-community', 'content-media']);
  assert.deepEqual(version.data.writeCutover, []);
  await probe('/api/v1/feed/dynamic?page=1&pageSize=5', 'identity-community');
  await probe('/api/v1/feeds/recommend?page=1&pageSize=5', 'content-media');
  await probe('/api/v1/videos/1', 'content-media');
  await probe('/api/v1/videos/1/comments', 'content-media');
  await probe('/api/v1/feed/sidebar/live', 'monolith');
  await probe('/api/v1/search/suggest?q=architecture', 'monolith');
  await probe('/api/v1/ai/video-chat/1', 'monolith');
  await probe('/api/v1/auth/register', 'monolith', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'must-stay-monolith' }),
  });
} else if (mode === 'identity-write') {
  assert.equal(version.data.routeMode, 'services');
  assert.deepEqual(version.data.readCutover, ['identity-community', 'content-media']);
  assert.deepEqual(version.data.writeCutover, ['identity-community']);

  const register = await fetch(`${baseUrl}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-request-id': 'identity-cutover-register' },
    body: JSON.stringify({ username: 'cutover_identity_user', password: 'CutoverIdentity123!', email: 'cutover-identity@example.com', nickname: '切流用户' }),
  });
  assert.equal(register.status, 200);
  assert.equal(register.headers.get('x-gateway-upstream'), 'identity-community');

  const login = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-request-id': 'identity-cutover-login' },
    body: JSON.stringify({ account: 'cutover_identity_user', password: 'CutoverIdentity123!' }),
  });
  assert.equal(login.status, 200);
  assert.equal(login.headers.get('x-gateway-upstream'), 'identity-community');
  const token = (await login.json()).data?.token;
  assert.equal(typeof token, 'string');

  for (const [path, method, body] of [
    ['/api/v1/users/profile', 'PUT', { nickname: '切流用户已更新', bio: 'identity write cutover' }],
    ['/api/v1/users/1/follow', 'POST', {}],
    ['/api/v1/feed/posts', 'POST', { content: 'identity write cutover post', images: [] }],
  ]) {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', 'x-request-id': `identity-write-${method}-${path}`.slice(0, 120) },
      body: JSON.stringify(body),
    });
    assert.equal(response.status, 200, `${path} returned ${response.status}`);
    assert.equal(response.headers.get('x-gateway-upstream'), 'identity-community');
  }

  await probe('/api/v1/auth/reset-password', 'monolith', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'must-stay-monolith' }),
  });
  await probe('/api/v1/videos/1/submit-review', 'monolith', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}',
  });
  await probe('/api/v1/reports', 'monolith', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}',
  });
} else {
  assert.equal(version.data.routeMode, 'monolith');
  await probe('/api/v1/feeds/recommend?page=1&pageSize=5', 'monolith');
}

console.log(`Gateway ${mode} cutover probe passed.`);
