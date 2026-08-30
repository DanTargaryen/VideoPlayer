import assert from 'node:assert/strict';

const [mode, baseUrl] = process.argv.slice(2);
if (!['read', 'rollback'].includes(mode) || !baseUrl) {
  throw new Error('Usage: node scripts/read-cutover-probe.mjs <read|rollback> <gateway-base-url>');
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
  await probe('/api/v1/feed/sidebar/live', 'monolith');
  await probe('/api/v1/search/suggest?q=architecture', 'monolith');
  await probe('/api/v1/videos/1/comments', 'monolith');
  await probe('/api/v1/auth/register', 'monolith', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'must-stay-monolith' }),
  });
} else {
  assert.equal(version.data.routeMode, 'monolith');
  await probe('/api/v1/feeds/recommend?page=1&pageSize=5', 'monolith');
}

console.log(`Gateway ${mode} cutover probe passed.`);
