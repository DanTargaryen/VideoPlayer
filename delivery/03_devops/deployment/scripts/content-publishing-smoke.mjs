import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { issueServiceToken } from '@videoplayer/shared-contracts';

const baseUrl = (process.env.CONTENT_BASE_URL ?? 'http://127.0.0.1:3102').replace(/\/$/, '');
const secret = process.env.SERVICE_JWT_SECRET?.trim();
const userToken = process.env.CONTENT_USER_TOKEN?.trim();
if (!secret || secret.length < 32) throw new Error('SERVICE_JWT_SECRET with at least 32 characters is required');
const runId = (process.env.CONTENT_PUBLISHING_RUN_ID ?? randomUUID()).slice(0, 48);

function headers(requestId, json = true) {
  if (userToken) return { 'x-request-id': requestId, authorization: `Bearer ${userToken}`, ...(json ? { 'content-type': 'application/json' } : {}) };
  const token = issueServiceToken({ caller: 'gateway', audience: 'content-media', scopes: ['content.user.forward'], secret, requestId });
  return { 'x-request-id': requestId, 'x-gateway-authorization': `Bearer ${token}`, 'x-user-id': '2', 'x-user-role': 'USER', 'x-user-nickname': encodeURIComponent('发布验收用户'), ...(json ? { 'content-type': 'application/json' } : {}) };
}

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const payload = response.headers.get('content-type')?.includes('json') ? await response.json() : null;
  return { response, payload };
}

const directory = await mkdtemp(join(tmpdir(), 'content-publishing-smoke-'));
try {
  const mediaPath = join(directory, 'valid.mp4');
  execFileSync(process.env.FFMPEG_PATH ?? 'ffmpeg', ['-y', '-f', 'lavfi', '-i', 'color=c=black:s=32x32:d=0.2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mediaPath], { stdio: 'ignore' });
  const bytes = await readFile(mediaPath);
  const digest = createHash('sha256').update(bytes).digest('hex');
  const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, '/');
  const objectKey = `videos/original/${datePrefix}/${digest.slice(0, 24)}-valid.mp4`;
  const mediaUrl = `/api/v1/media/objects/${encodeURIComponent(objectKey)}`;

  const form = new FormData();
  form.set('file', new Blob([bytes], { type: 'video/mp4' }), 'valid.mp4');
  const uploadRequestId = `publishing-${runId}-upload`;
  const upload = await request('/api/v1/videos/upload?assetType=ORIGINAL', { method: 'POST', headers: headers(uploadRequestId, false), body: form });
  assert.equal(upload.response.status, 200);
  assert.equal(upload.payload.data.uploadToken, objectKey);
  assert.equal(typeof upload.payload.data.assetId, 'number');

  const ranged = await fetch(`${baseUrl}${upload.payload.data.url}`, { headers: { range: 'bytes=0-31' } });
  assert.equal(ranged.status, 206);
  assert.equal((await ranged.arrayBuffer()).byteLength, 32);

  const createRequestId = `publishing-${runId}-create`;
  const createBody = JSON.stringify({ assetId: upload.payload.data.assetId, title: `发布验收 ${runId}`, description: '真实 MinIO 投稿与草稿管理', categories: ['tech', 'study'] });
  const created = await request('/api/v1/videos', { method: 'POST', headers: headers(createRequestId), body: createBody });
  const replayedCreate = await request('/api/v1/videos', { method: 'POST', headers: headers(createRequestId), body: createBody });
  assert.equal(created.response.status, 200);
  assert.deepEqual(created.payload.data, replayedCreate.payload.data);
  assert.equal(typeof created.payload.data.id, 'number');

  const update = await request(`/api/v1/videos/${created.payload.data.id}`, { method: 'PUT', headers: headers(`publishing-${runId}-update`), body: JSON.stringify({ title: `发布验收已更新 ${runId}`, categories: ['study'] }) });
  assert.equal(update.response.status, 200);
  assert.deepEqual(update.payload.data.categories, ['study']);

  const creatorVideos = await request('/api/v1/creator/videos', { headers: headers(`publishing-${runId}-videos`, false) });
  assert(creatorVideos.payload.data.some((item) => item.id === created.payload.data.id));
  assert.equal((await request('/api/v1/creator/dashboard', { headers: headers(`publishing-${runId}-dashboard`, false) })).response.status, 200);
  assert.equal((await request('/api/v1/creator/videos/play-trend', { headers: headers(`publishing-${runId}-play-trend`, false) })).payload.data.length, 7);
  assert.equal((await request('/api/v1/creator/followers/trend', { headers: headers(`publishing-${runId}-follower-trend`, false) })).payload.data.length, 7);

  assert.equal((await request(`/api/v1/videos/${created.payload.data.id}/submit-review`, { method: 'POST', headers: headers(`publishing-${runId}-submit`, false) })).response.status, 200);
  const history = await request(`/api/v1/videos/${created.payload.data.id}/reviews`, { headers: headers(`publishing-${runId}-history`, false) });
  assert.equal(history.response.status, 200);
  assert.equal(history.payload.data.length, 1);
  assert.equal((await request(`/api/v1/videos/${created.payload.data.id}/withdraw-review`, { method: 'POST', headers: headers(`publishing-${runId}-withdraw`, false) })).response.status, 200);
  assert.deepEqual((await request(`/api/v1/videos/${created.payload.data.id}/reviews`, { headers: headers(`publishing-${runId}-history-after`, false) })).payload.data, []);

  const conflictForm = new FormData();
  conflictForm.set('file', new Blob([bytes], { type: 'video/mp4' }), 'other.mp4');
  const conflict = await request('/api/v1/videos/upload?assetType=ORIGINAL', { method: 'POST', headers: headers(uploadRequestId, false), body: conflictForm });
  assert.equal(conflict.response.status, 409);
  const conflictObject = `videos/original/${datePrefix}/${digest.slice(0, 24)}-other.mp4`;
  assert.equal((await fetch(`${baseUrl}/api/v1/media/objects/${encodeURIComponent(conflictObject)}`)).status, 404);

  const deleted = await request(`/api/v1/videos/${created.payload.data.id}`, { method: 'DELETE', headers: headers(`publishing-${runId}-delete`, false) });
  assert.equal(deleted.response.status, 200);
  assert.equal((await fetch(`${baseUrl}${mediaUrl}`)).status, 404);

  process.stdout.write(`content publishing smoke passed runId=${runId} videoId=${created.payload.data.id} assetId=${upload.payload.data.assetId}\n`);
} finally {
  await rm(directory, { recursive: true, force: true });
}
