import { execFileSync, spawn } from 'node:child_process';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Client as MinioClient } from 'minio';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const suffix = `${process.pid}-${Date.now()}`;
const secret = `ms03-content-contract-secret-${suffix}`.slice(0, 64);
const bucket = 'videoplayer-content';
const mysqlRootPassword = `root-${suffix}`;
const contentPassword = `content-${suffix}`;
const livePassword = `live-${suffix}`;
const contentDatabase = 'content_media_integration';
const liveDatabase = 'live_reward_integration';
const containers = {
  contentMysql: `ms03-content-mysql-${suffix}`,
  liveMysql: `ms03-live-mysql-${suffix}`,
  minio: `ms03-content-minio-${suffix}`,
  srs: `ms03-srs-${suffix}`,
};
const childProcesses = [];

function docker(args, options = {}) {
  return execFileSync('docker', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...options }).trim();
}

function npm(args, env) {
  const executable = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  execFileSync(executable, args, { cwd: root, env: { ...process.env, ...env }, stdio: 'inherit', shell: process.platform === 'win32' });
}

function port(container, target) {
  return Number(docker(['inspect', '--format', `{{(index (index .NetworkSettings.Ports "${target}/tcp") 0).HostPort}}`, container]));
}

async function waitFor(check, label, attempts = 60) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      await check();
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  throw new Error(`${label} did not become ready: ${lastError?.message ?? 'unknown error'}`);
}

async function waitForHttp(url) {
  await waitFor(async () => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  }, url);
}

async function waitForMysql(container, password, database) {
  await waitFor(() => {
    docker(['exec', container, 'mysql', '-N', '-uroot', `-p${password}`, database, '-e', 'SELECT 1']);
  }, `${container} MySQL`);
}

function startProcess(command, args, env) {
  const child = spawn(command, args, { cwd: root, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.on('data', (chunk) => process.stdout.write(`[${args.at(-1)}] ${chunk}`));
  child.stderr.on('data', (chunk) => process.stderr.write(`[${args.at(-1)}] ${chunk}`));
  childProcesses.push(child);
  return child;
}

async function jsonRequest(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { 'content-type': 'application/json', ...(options.headers ?? {}) } });
  const payload = await response.json();
  if (!response.ok) throw new Error(`${options.method ?? 'GET'} ${url} returned ${response.status}: ${JSON.stringify(payload)}`);
  return payload.data;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function generateMedia(image, format) {
  const codec = format === 'webm' ? ['-c:v', 'libvpx-vp9', '-f', 'webm'] : ['-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', 'frag_keyframe+empty_moov', '-f', 'mp4'];
  return execFileSync('docker', ['run', '--rm', '--entrypoint', 'ffmpeg', image, '-v', 'error', '-f', 'lavfi', '-i', 'color=c=black:s=320x240:d=0.4', '-an', ...codec, 'pipe:1'], { cwd: root, maxBuffer: 16 * 1024 * 1024 });
}

async function main() {
  npm(['--workspace', '@videoplayer/shared-contracts', 'run', 'build']);
  npm(['--workspace', '@videoplayer/content-media', 'run', 'build']);
  npm(['--workspace', '@videoplayer/live-reward', 'run', 'build']);
  docker(['build', '--platform', 'linux/amd64', '--provenance=false', '-f', 'services/content-media/Dockerfile', '-t', `video-player/content-media:integration-${suffix}`, '.']);
  const mediaImage = `video-player/content-media:integration-${suffix}`;

  docker(['run', '--detach', '--rm', '--name', containers.contentMysql, '--publish', '127.0.0.1::3306', '-e', `MYSQL_ROOT_PASSWORD=${mysqlRootPassword}`, '-e', `MYSQL_DATABASE=${contentDatabase}`, '-e', 'MYSQL_USER=content_media', '-e', `MYSQL_PASSWORD=${contentPassword}`, 'mysql:8.0']);
  docker(['run', '--detach', '--rm', '--name', containers.liveMysql, '--publish', '127.0.0.1::3306', '-e', `MYSQL_ROOT_PASSWORD=${mysqlRootPassword}`, '-e', `MYSQL_DATABASE=${liveDatabase}`, '-e', 'MYSQL_USER=live_reward', '-e', `MYSQL_PASSWORD=${livePassword}`, 'mysql:8.0']);
  docker(['run', '--detach', '--rm', '--name', containers.minio, '--publish', '127.0.0.1::9000', '-e', 'MINIO_ROOT_USER=contentmedia', '-e', `MINIO_ROOT_PASSWORD=minio-${suffix}-password`, 'minio/minio@sha256:14cea493d9a34af32f524e538b8346cf79f3321eff8e708c1e2960462bd8936e', 'server', '/data']);
  docker(['run', '--detach', '--rm', '--name', containers.srs, '--publish', '127.0.0.1::1985', 'ossrs/srs:5']);

  const contentMysqlPort = port(containers.contentMysql, 3306);
  const liveMysqlPort = port(containers.liveMysql, 3306);
  const minioPort = port(containers.minio, 9000);
  const srsPort = port(containers.srs, 1985);
  const contentDatabaseUrl = `mysql://content_media:${contentPassword}@127.0.0.1:${contentMysqlPort}/${contentDatabase}`;
  const liveDatabaseUrl = `mysql://live_reward:${livePassword}@127.0.0.1:${liveMysqlPort}/${liveDatabase}`;
  await Promise.all([
    waitForMysql(containers.contentMysql, mysqlRootPassword, contentDatabase),
    waitForMysql(containers.liveMysql, mysqlRootPassword, liveDatabase),
    waitForHttp(`http://127.0.0.1:${minioPort}/minio/health/live`),
    waitForHttp(`http://127.0.0.1:${srsPort}/api/v1/versions`),
  ]);
  npm(['--workspace', '@videoplayer/content-media', 'run', 'db:migrate'], { CONTENT_DATABASE_URL: contentDatabaseUrl });
  npm(['--workspace', '@videoplayer/live-reward', 'run', 'db:migrate'], { LIVE_REWARD_DATABASE_URL: liveDatabaseUrl });
  npm(['--workspace', '@videoplayer/live-reward', 'run', 'db:seed'], { LIVE_REWARD_DATABASE_URL: liveDatabaseUrl, LIVE_REWARD_FIXTURE_USER_ID: '7' });

  const contentPort = 3202;
  const livePort = 3203;
  startProcess(process.execPath, ['services/content-media/dist/index.js'], { PORT: String(contentPort), CONTENT_DATABASE_URL: contentDatabaseUrl, SERVICE_JWT_SECRET: secret, GIT_SHA: `integration-${suffix}` });
  startProcess(process.execPath, ['services/live-reward/dist/index.js'], { PORT: String(livePort), LIVE_REWARD_DATABASE_URL: liveDatabaseUrl, CONTENT_SERVICE_URL: `http://127.0.0.1:${contentPort}`, SERVICE_JWT_SECRET: secret, SRS_API_BASE: `http://127.0.0.1:${srsPort}`, SRS_WEBRTC_BASE: 'webrtc://127.0.0.1/live', GIT_SHA: `integration-${suffix}` });
  await Promise.all([waitForHttp(`http://127.0.0.1:${contentPort}/health/ready`), waitForHttp(`http://127.0.0.1:${livePort}/health/ready`)]);

  const minio = new MinioClient({ endPoint: '127.0.0.1', port: minioPort, useSSL: false, accessKey: 'contentmedia', secretKey: `minio-${suffix}-password` });
  await minio.makeBucket(bucket);
  const media = { webm: await generateMedia(mediaImage, 'webm'), mp4: await generateMedia(mediaImage, 'mp4') };
  for (const [format, bytes] of Object.entries(media)) {
    const mimeType = `video/${format}`;
    const objectKey = `replays/${suffix}.${format}`;
    await minio.putObject(bucket, objectKey, bytes, bytes.length, { 'Content-Type': mimeType });
    const stat = await minio.statObject(bucket, objectKey);
    const header = stat.metaData['content-type'] ?? stat.metaData['Content-Type'];
    assert(header === mimeType, `${format} MinIO Content-Type mismatch: ${header}`);
  }

  const liveBase = `http://127.0.0.1:${livePort}`;
  const headers = { 'x-user-id': '7', 'x-user-nickname': 'integration-anchor' };
  const room = await jsonRequest(`${liveBase}/api/v1/lives/rooms`, { method: 'POST', headers, body: JSON.stringify({ title: `真实回放联调 ${suffix} WebM` }) });
  const started = await jsonRequest(`${liveBase}/api/v1/lives/rooms/${room.id}/start`, { method: 'POST', headers });
  await jsonRequest(`${liveBase}/api/v1/lives/rooms/${room.id}/viewers`, { method: 'POST', headers, body: JSON.stringify({ viewerId: `viewer-${suffix}-webm` }) });
  await jsonRequest(`${liveBase}/api/v1/lives/rooms/${room.id}/messages`, { method: 'POST', headers, body: JSON.stringify({ content: '真实回放联调消息' }) });
  await jsonRequest(`${liveBase}/api/v1/lives/rooms/${room.id}/stop`, { method: 'POST', headers });
  const replays = {};
  for (const format of ['webm', 'mp4']) {
    const objectKey = `replays/${suffix}.${format}`;
    let targetRoom = room;
    if (format === 'mp4') {
      targetRoom = await jsonRequest(`${liveBase}/api/v1/lives/rooms`, { method: 'POST', headers, body: JSON.stringify({ title: `真实回放联调 ${suffix} MP4` }) });
      await jsonRequest(`${liveBase}/api/v1/lives/rooms/${targetRoom.id}/start`, { method: 'POST', headers });
      await jsonRequest(`${liveBase}/api/v1/lives/rooms/${targetRoom.id}/viewers`, { method: 'POST', headers, body: JSON.stringify({ viewerId: `viewer-${suffix}-mp4` }) });
      await jsonRequest(`${liveBase}/api/v1/lives/rooms/${targetRoom.id}/messages`, { method: 'POST', headers, body: JSON.stringify({ content: '真实回放联调消息' }) });
      await jsonRequest(`${liveBase}/api/v1/lives/rooms/${targetRoom.id}/stop`, { method: 'POST', headers });
    }
    replays[format] = await jsonRequest(`${liveBase}/api/v1/lives/rooms/${targetRoom.id}/replay`, { method: 'POST', headers: { ...headers, 'x-request-id': `replay-${suffix}-${format}` }, body: JSON.stringify({ objectKey, mimeType: `video/${format}` }) });
    assert(replays[format].status === 'COMPLETED', `${format} replay did not complete: ${JSON.stringify(replays[format])}`);
    assert(typeof replays[format].contentVideoId === 'string', `${format} contentVideoId is not a string`);
  }
  const mismatchBefore = await jsonRequest(`${liveBase}/api/v1/lives/sessions/${started.sessionId}`, { headers });
  await fetch(`${liveBase}/api/v1/lives/rooms/${room.id}/replay`, { method: 'POST', headers: { ...headers, 'x-request-id': `replay-${suffix}-mismatch` }, body: JSON.stringify({ objectKey: `replays/${suffix}.mp4`, mimeType: 'video/webm' }) }).then(async (response) => assert(response.status === 400, `mismatched replay returned ${response.status}`));
  const mismatchAfter = await jsonRequest(`${liveBase}/api/v1/lives/sessions/${started.sessionId}`, { headers });
  assert(mismatchBefore.replay.id === mismatchAfter.replay.id && mismatchAfter.replay.status === 'COMPLETED', 'mismatched replay mutated live state');

  const { PrismaClient: LivePrismaClient } = await import('../services/live-reward/generated/index.js');
  const { PrismaClient: ContentPrismaClient } = await import('../services/content-media/generated/prisma-client/index.js');
  const livePrisma = new LivePrismaClient({ datasources: { db: { url: liveDatabaseUrl } } });
  const contentPrisma = new ContentPrismaClient({ datasources: { db: { url: contentDatabaseUrl } } });
  try {
    for (const format of ['webm', 'mp4']) {
      const objectKey = `replays/${suffix}.${format}`;
      const liveReplay = await livePrisma.replayRegistration.findUnique({ where: { objectKey } });
      const asset = await contentPrisma.videoAsset.findUnique({ where: { objectKey } });
      assert(liveReplay?.status === 'COMPLETED', `${format} live replay status mismatch`);
      assert(liveReplay?.contentVideoId === asset?.videoId, `${format} cross-service contentVideoId mismatch`);
      assert(liveReplay?.requestId === asset?.requestId, `${format} requestId mismatch`);
      assert(liveReplay?.objectKey === asset?.objectKey, `${format} objectKey mismatch`);
      assert(liveReplay?.mimeType === asset?.mimeType, `${format} MIME mismatch`);
      const stat = await minio.statObject(bucket, objectKey);
      const header = stat.metaData['content-type'] ?? stat.metaData['Content-Type'];
      assert(asset?.mimeType === header, `${format} database/MinIO MIME mismatch`);
    }
  } finally {
    await Promise.all([livePrisma.$disconnect(), contentPrisma.$disconnect()]);
  }

  process.env.SERVICE_JWT_SECRET = secret;
  const { ContentReplayClient } = await import('../services/live-reward/dist/live-app.js');
  const client = new ContentReplayClient(`http://127.0.0.1:${contentPort}`);
  const duplicateInput = { requestId: `replay-${suffix}-webm`, objectKey: `replays/${suffix}.webm`, mimeType: 'video/webm', creatorId: '7', title: `真实回放联调 ${suffix} WebM` };
  const duplicate = await client.register(duplicateInput);
  assert(duplicate.contentVideoId === replays.webm.contentVideoId, 'content-media duplicate replay was not idempotent');
  await client.register({ ...duplicateInput, title: '冲突载荷' }).then(() => { throw new Error('content-media conflict unexpectedly succeeded'); }, (error) => assert(error.status === 409, `content-media conflict returned ${error.status}`));
  console.log(JSON.stringify({ passed: true, roomId: room.id, sessionId: started.sessionId, replayIds: replays, minioBucket: bucket, formats: ['webm', 'mp4'] }));
}

try {
  await main();
} finally {
  for (const child of childProcesses) child.kill();
  for (const container of Object.values(containers)) {
    try { docker(['rm', '--force', container]); } catch { /* Container may not have started. */ }
  }
}
