import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const mode = process.env.FAULT_MODE?.trim();
const token = process.env.FAULT_USER_TOKEN?.trim();
const gateway = (process.env.FAULT_GATEWAY_URL ?? 'http://127.0.0.1:3100').replace(/\/$/, '');
if (!mode) throw new Error('FAULT_MODE is required');
if (!token && !mode.startsWith('database-')) throw new Error('FAULT_USER_TOKEN is required');
let counter = 0;

function headers(json = true) {
  counter += 1;
  return { authorization: `Bearer ${token}`, 'x-request-id': `fault-${mode}-${Date.now()}-${counter}`, ...(json ? { 'content-type': 'application/json' } : {}) };
}

async function request(path, options = {}) {
  const response = await fetch(`${gateway}${path}`, { ...options, signal: AbortSignal.timeout(options.timeoutMs ?? 8_000) });
  const payload = await response.json().catch(() => null);
  return { response, payload, data: payload?.data };
}

async function assertReady(port, expected = 200) {
  const response = await fetch(`http://127.0.0.1:${port}/health/ready`, { signal: AbortSignal.timeout(2_000) }).catch(() => null);
  assert.equal(response?.status ?? 0, expected, `port ${port} readiness returned ${response?.status ?? 0}`);
}

async function assertUnaffectedServices() {
  for (const port of [3101, 3104]) await assertReady(port);
  const gatewayHealth = await fetch('http://127.0.0.1:3100/health/ready', { signal: AbortSignal.timeout(2_000) });
  assert.equal(gatewayHealth.status, 200);
}

function mediaBytes() {
  const directory = mkdtempSync(join(tmpdir(), 'fault-media-'));
  try {
    const path = join(directory, 'fault.mp4');
    execFileSync(process.env.FFMPEG_PATH ?? 'ffmpeg', ['-y', '-f', 'lavfi', '-i', 'color=c=orange:s=32x32:d=0.2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', path], { stdio: 'ignore' });
    return readFileSync(path);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

if (mode === 'srs-failure') {
  const created = await request('/api/v1/lives/rooms', { method: 'POST', headers: headers(), body: JSON.stringify({ title: `EXP-02 SRS ${Date.now()}`, category: 'tech' }) });
  assert.equal(created.response.status, 200, JSON.stringify(created.payload));
  const roomId = created.data?.id;
  assert(roomId, 'room creation failed');
  const started = await request(`/api/v1/lives/rooms/${roomId}/start`, { method: 'POST', headers: headers(false) });
  assert([503, 504].includes(started.response.status), `SRS failure returned ${started.response.status}`);
  assert.match(started.payload?.message ?? '', /SRS|timed out|unavailable/i);
  await assertUnaffectedServices();
  process.stdout.write(JSON.stringify({ mode, roomId, failureStatus: started.response.status }));
} else if (mode === 'srs-recovery') {
  const roomId = process.env.FAULT_ROOM_ID;
  assert(roomId, 'FAULT_ROOM_ID is required');
  const started = await request(`/api/v1/lives/rooms/${roomId}/start`, { method: 'POST', headers: headers(false) });
  assert.equal(started.response.status, 200, JSON.stringify(started.payload));
  const stopped = await request(`/api/v1/lives/rooms/${roomId}/stop`, { method: 'POST', headers: headers(false) });
  assert.equal(stopped.response.status, 200, JSON.stringify(stopped.payload));
  await assertUnaffectedServices();
  process.stdout.write(JSON.stringify({ mode, roomId, status: stopped.data?.status }));
} else if (mode === 'minio-failure' || mode === 'minio-recovery') {
  const form = new FormData();
  form.set('file', new Blob([mediaBytes()], { type: 'video/mp4' }), `fault-${Date.now()}.mp4`);
  const upload = await request('/api/v1/videos/upload?assetType=ORIGINAL', { method: 'POST', headers: headers(false), body: form, timeoutMs: 15_000 });
  if (mode === 'minio-failure') {
    assert(upload.response.status >= 500, `MinIO failure upload returned ${upload.response.status}`);
    assert(upload.payload && typeof upload.payload.message === 'string', 'MinIO failure did not return a standard error envelope');
    await assertUnaffectedServices();
    await assertReady(3103);
  } else {
    assert.equal(upload.response.status, 200, JSON.stringify(upload.payload));
    assert(upload.data?.assetId && upload.data?.uploadToken, 'MinIO recovery upload returned an invalid asset');
    await assertUnaffectedServices();
    await assertReady(3102);
  }
  process.stdout.write(JSON.stringify({ mode, status: upload.response.status, message: upload.payload?.message ?? null }));
} else if (mode === 'database-failure') {
  await assertReady(3103, 503);
  await assertUnaffectedServices();
  await assertReady(3102);
  process.stdout.write(JSON.stringify({ mode, liveReady: 503, unaffectedReady: 200 }));
} else if (mode === 'database-recovery') {
  await assertReady(3103, 200);
  await assertUnaffectedServices();
  await assertReady(3102);
  process.stdout.write(JSON.stringify({ mode, liveReady: 200, unaffectedReady: 200 }));
} else {
  throw new Error(`Unsupported FAULT_MODE: ${mode}`);
}
