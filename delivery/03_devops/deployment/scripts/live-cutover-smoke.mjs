import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const baseUrl = (process.env.LIVE_CUTOVER_BASE_URL ?? 'http://127.0.0.1:3100').replace(/\/$/, '');
const userToken = process.env.LIVE_CUTOVER_USER_TOKEN?.trim();
if (!userToken) throw new Error('LIVE_CUTOVER_USER_TOKEN is required');
const runId = (process.env.LIVE_CUTOVER_RUN_ID ?? randomUUID()).replace(/[^a-zA-Z0-9-]/g, '').slice(0, 48);
let requestCounter = 0;

function headers(requestId = `live-cutover-${runId}-${++requestCounter}`, json = true) {
  return {
    authorization: `Bearer ${userToken}`,
    'x-request-id': requestId,
    'x-user-id': '999',
    'x-user-role': 'ADMIN',
    ...(json ? { 'content-type': 'application/json' } : {}),
  };
}

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const payload = response.headers.get('content-type')?.includes('json') ? await response.json() : null;
  return { response, payload };
}

function assertLive(result, status = 200) {
  assert.equal(result.response.status, status, JSON.stringify(result.payload));
  assert.equal(result.response.headers.get('x-gateway-upstream'), 'live-reward');
  return result.payload?.data;
}

for (const path of ['/api/v1/lives/center/overview', '/api/v1/lives/categories', '/api/v1/lives/plaza', '/api/v1/lives/hot']) {
  assertLive(await request(path, { headers: headers(undefined, false) }));
}

const created = assertLive(await request('/api/v1/lives/rooms', {
  method: 'POST', headers: headers(), body: JSON.stringify({ title: `UC05 cutover ${runId}`, category: 'tech', sourceMode: 'camera' }),
}));
assert.equal(created.broadcaster.id, 1, 'forged x-user-id must be replaced by the verified identity');
const roomId = created.id;
const started = assertLive(await request(`/api/v1/lives/rooms/${roomId}/start`, { method: 'POST', headers: headers(undefined, false) }));
assert.equal(started.status, 'LIVING');

const frame = 'data:image/jpeg;base64,AA==';
assert.equal(assertLive(await request(`/api/v1/lives/rooms/${roomId}/frame`, { method: 'POST', headers: headers(), body: JSON.stringify({ image: frame }) })).image, frame);
assert.equal(assertLive(await request(`/api/v1/lives/rooms/${roomId}/frame`, { headers: headers(undefined, false) })).image, frame);

const viewer = assertLive(await request(`/api/v1/lives/rooms/${roomId}/viewers`, { method: 'POST', headers: headers(), body: '{}' }));
assert(viewer.viewerId);
assert.equal(assertLive(await request(`/api/v1/lives/rooms/${roomId}/viewers/${viewer.viewerId}/offer`, { method: 'POST', headers: headers(), body: JSON.stringify({ type: 'offer', sdp: 'uc05-viewer-offer' }) })).received, true);
const pending = assertLive(await request(`/api/v1/lives/rooms/${roomId}/publisher/pending-viewers`, { headers: headers(undefined, false) }));
assert(pending.some((item) => String(item.viewerId) === String(viewer.viewerId)));
assert.equal(assertLive(await request(`/api/v1/lives/rooms/${roomId}/viewers/${viewer.viewerId}/answer`, { method: 'POST', headers: headers(), body: JSON.stringify({ type: 'answer', sdp: 'uc05-publisher-answer' }) })).delivered, true);
assert.equal(assertLive(await request(`/api/v1/lives/rooms/${roomId}/viewers/${viewer.viewerId}/answer`, { headers: headers(undefined, false) })).ready, true);

const message = assertLive(await request(`/api/v1/lives/rooms/${roomId}/messages`, { method: 'POST', headers: headers(), body: JSON.stringify({ content: 'UC05 微服务弹幕' }) }));
assert.equal(message.roomId, roomId);
assert.equal(message.sender.id, 1);
assert(assertLive(await request(`/api/v1/lives/rooms/${roomId}/messages`, { headers: headers(undefined, false) })).some((item) => item.id === message.id && item.sender?.id === 1));

const walletBefore = assertLive(await request('/api/v1/gift-coins/wallet', { headers: headers(undefined, false) }));
const dailyRequestId = `live-cutover-${runId}-daily`;
const daily = assertLive(await request('/api/v1/gift-coins/daily-claim', { method: 'POST', headers: headers(dailyRequestId, false) }));
const dailyReplay = assertLive(await request('/api/v1/gift-coins/daily-claim', { method: 'POST', headers: headers(dailyRequestId, false) }));
assert.equal(dailyReplay.balance, daily.balance);
assertLive(await request('/api/v1/gift-coins/gift', { method: 'POST', headers: headers(), body: JSON.stringify({ amount: 1 }) }));
assertLive(await request('/api/v1/videos/1/coin', { method: 'POST', headers: headers(), body: JSON.stringify({ amount: 1 }) }));
const walletAfter = assertLive(await request('/api/v1/gift-coins/wallet', { headers: headers(undefined, false) }));
assert(Number.isInteger(walletBefore.balance) && Number.isInteger(walletAfter.balance));

assertLive(await request(`/api/v1/lives/rooms/${roomId}/viewers/${viewer.viewerId}`, { method: 'DELETE', headers: headers(undefined, false) }));
const stopped = assertLive(await request(`/api/v1/lives/rooms/${roomId}/stop`, { method: 'POST', headers: headers(undefined, false) }));
assert.equal(stopped.status, 'ENDED');

const directory = await mkdtemp(join(tmpdir(), 'live-cutover-smoke-'));
try {
  const mediaPath = join(directory, 'uc05-replay.mp4');
  execFileSync(process.env.FFMPEG_PATH ?? 'ffmpeg', ['-y', '-f', 'lavfi', '-i', 'color=c=blue:s=32x32:d=0.2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mediaPath], { stdio: 'ignore' });
  const form = new FormData();
  form.set('file', new Blob([await readFile(mediaPath)], { type: 'video/mp4' }), 'uc05-replay.mp4');
  const upload = await request('/api/v1/videos/upload?assetType=RECORDING', { method: 'POST', headers: headers(undefined, false), body: form });
  assert.equal(upload.response.status, 200, JSON.stringify(upload.payload));
  assert.equal(upload.response.headers.get('x-gateway-upstream'), 'content-media');
  const replayRequestId = `live-cutover-${runId}-replay`;
  const replayBody = JSON.stringify({ saveMode: 'UPLOAD', assetId: upload.payload.data.assetId, uploadToken: upload.payload.data.uploadToken, title: `UC05 回放 ${runId}` });
  const replay = assertLive(await request(`/api/v1/lives/rooms/${roomId}/replay`, { method: 'POST', headers: headers(replayRequestId), body: replayBody }));
  const replayed = assertLive(await request(`/api/v1/lives/rooms/${roomId}/replay`, { method: 'POST', headers: headers(replayRequestId), body: replayBody }));
  assert.equal(replayed.replayVideoId, replay.replayVideoId);
  assert(Number.isSafeInteger(replay.replayVideoId));
  const ranged = await fetch(`${baseUrl}${replay.replayUrl}`, { headers: { range: 'bytes=0-31' } });
  assert.equal(ranged.status, 206);
  assert.equal(ranged.headers.get('x-gateway-upstream'), 'content-media');
  assert.equal((await ranged.arrayBuffer()).byteLength, 32);
} finally {
  await rm(directory, { recursive: true, force: true });
}

const session = assertLive(await request(`/api/v1/lives/sessions/${started.sessionId}`, { headers: headers(undefined, false) }));
assert.equal(session.status, 'ENDED');
assert.equal(session.replayStatus, 'COMPLETED');
process.stdout.write(`live cutover UC05 smoke passed runId=${runId} roomId=${roomId} sessionId=${started.sessionId}\n`);
