import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { Client } from 'minio';

import { createFixtureState, createVideoAfterMediaValidation } from '../dist/service.js';

const image = 'video-player/content-media:verify';
const container = `content-media-minio-${process.pid}`;
const accessKey = 'contentmedia';
const secretKey = `content-media-${process.pid}-password`;
const bucket = 'videoplayer-content';

function docker(args, options = {}) {
  return execFileSync('docker', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...options }).trim();
}

async function waitForMinio(port) {
  let lastError;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/minio/health/live`);
      if (response.ok) return;
      lastError = new Error(`MinIO returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 1000));
  }
  throw lastError ?? new Error('Timed out waiting for MinIO');
}

async function listObjectKeys(client) {
  const stream = client.listObjects(bucket, '', true);
  const keys = [];
  for await (const item of stream) {
    if (item.name) keys.push(item.name);
  }
  return keys;
}

async function objectExists(client, objectKey) {
  try {
    await client.statObject(bucket, objectKey);
    return true;
  } catch {
    return false;
  }
}

async function createValidMp4() {
  const directory = await mkdtemp(join(tmpdir(), 'content-media-minio-'));
  const output = join(directory, 'valid.mp4');
  docker([
    'run',
    '--rm',
    '--entrypoint',
    'ffmpeg',
    '--mount',
    `type=bind,source=${resolve(directory)},target=/out`,
    image,
    '-y',
    '-f',
    'lavfi',
    '-i',
    'color=c=black:s=16x16:d=0.1',
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '/out/valid.mp4',
  ]);
  docker([
    'run',
    '--rm',
    '--entrypoint',
    'ffprobe',
    '--mount',
    `type=bind,source=${resolve(directory)},target=/out`,
    image,
    '-v',
    'error',
    '-select_streams',
    'v:0',
    '-show_entries',
    'stream=codec_type',
    '-of',
    'default=noprint_wrappers=1:nokey=1',
    '/out/valid.mp4',
  ]);
  return { directory, bytes: await readFile(output) };
}

try {
  try {
    docker(['image', 'inspect', image]);
  } catch {
    docker(['build', '-f', 'services/content-media/Dockerfile', '-t', image, '.'], { cwd: '../..' });
  }

  docker([
    'run',
    '--detach',
    '--rm',
    '--name',
    container,
    '--publish',
    '127.0.0.1::9000',
    '-e',
    `MINIO_ROOT_USER=${accessKey}`,
    '-e',
    `MINIO_ROOT_PASSWORD=${secretKey}`,
    'minio/minio:latest',
    'server',
    '/data',
  ]);
  const port = docker(['inspect', '--format', '{{(index (index .NetworkSettings.Ports "9000/tcp") 0).HostPort}}', container]);
  await waitForMinio(port);

  const client = new Client({ endPoint: '127.0.0.1', port: Number(port), useSSL: false, accessKey, secretKey });
  await client.makeBucket(bucket);

  const state = createFixtureState();
  const fake = await createVideoAfterMediaValidation(
    state,
    { filename: 'fake.mp4', mimeType: 'video/mp4', bytes: Buffer.from('not a video'), objectKey: 'uploads/fake.mp4' },
    async () => {
      throw new Error('should not write database');
    },
  );
  const objectsAfterFake = await listObjectKeys(client);
  if (fake.status !== 400 || objectsAfterFake.length !== 0 || state.videos.length !== 3 || state.assets.length !== 1) {
    throw new Error('disguised MP4 should leave zero MinIO objects and zero content rows');
  }

  const validMp4 = await createValidMp4();
  try {
    const successObject = 'uploads/valid.mp4';
    await client.putObject(bucket, successObject, validMp4.bytes, validMp4.bytes.length, { 'Content-Type': 'video/mp4' });
    const success = await createVideoAfterMediaValidation(
      state,
      { filename: 'valid.mp4', mimeType: 'video/mp4', bytes: validMp4.bytes, objectKey: successObject },
      async () => ({ ...state.videos[0], id: '2000', status: 'DRAFT' }),
      { async probe() { return { ok: true }; } },
    );
    if (success.status !== 201 || !(await objectExists(client, successObject))) {
      throw new Error('valid MP4 should pass ffprobe and keep its MinIO object');
    }

    const failureObject = 'uploads/db-failure.mp4';
    await client.putObject(bucket, failureObject, validMp4.bytes, validMp4.bytes.length, { 'Content-Type': 'video/mp4' });
    const failure = await createVideoAfterMediaValidation(
      state,
      { filename: 'valid.mp4', mimeType: 'video/mp4', bytes: validMp4.bytes, objectKey: failureObject },
      async () => {
        throw new Error('db down');
      },
      { async probe() { return { ok: true }; } },
      {
        async deleteObject(targetBucket, objectKey) {
          await client.removeObject(targetBucket, objectKey);
        },
      },
    );
    if (failure.status !== 500 || (await objectExists(client, failureObject)) || !(await objectExists(client, successObject))) {
      throw new Error('database failure should delete only the current MinIO object');
    }
    const finalObjects = await listObjectKeys(client);
    process.stdout.write(
      `content-media MinIO chain passed fakeMp4=400 objectsAfterFake=0 validMp4=201 dbFailure=500 finalObjects=${finalObjects.length} deletedObject=${state.deletedObjects.at(-1)}\n`,
    );
  } finally {
    await rm(validMp4.directory, { recursive: true, force: true });
  }
} finally {
  try {
    docker(['rm', '--force', container]);
  } catch {
    // The container may not have started; there is nothing to clean up.
  }
}
