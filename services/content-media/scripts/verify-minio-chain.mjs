import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { Client } from 'minio';

import { createFixtureState, createVideoAfterMediaValidation } from '../dist/service.js';

const image = 'video-player/content-media:verify';
const minioContainer = `content-media-minio-${process.pid}`;
const mysqlContainer = `content-media-minio-mysql-${process.pid}`;
const mediaGeneratorContainer = `content-media-generator-${process.pid}`;
const accessKey = 'contentmedia';
const secretKey = `content-media-${process.pid}-password`;
const mysqlPassword = `content-media-${process.pid}-mysql-password`;
const database = 'content_media_minio_verify';
const bucket = 'videoplayer-content';
const minioImage = 'minio/minio@sha256:14cea493d9a34af32f524e538b8346cf79f3321eff8e708c1e2960462bd8936e';

function docker(args, options = {}) {
  return execFileSync('docker', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...options }).trim();
}

function runDocker(args, options = {}) {
  execFileSync('docker', args, { stdio: 'inherit', ...options });
}

function npm(args, options = {}) {
  const stdio = options.stdio ?? ['ignore', 'pipe', 'pipe'];
  const childOptions = { encoding: 'utf8', ...options, stdio };
  if (process.env.npm_execpath) {
    return (execFileSync(process.execPath, [process.env.npm_execpath, ...args], childOptions) ?? '').toString().trim();
  }
  const executable = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  return (execFileSync(executable, args, childOptions) ?? '').toString().trim();
}

async function waitForHttp(url) {
  let lastError;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
      lastError = new Error(`${url} returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 1000));
  }
  throw lastError ?? new Error(`Timed out waiting for ${url}`);
}

async function waitForMysql() {
  let lastError;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      docker(['exec', mysqlContainer, 'mysql', '-N', '-uroot', `-p${mysqlPassword}`, database, '-e', 'SELECT 1']);
      return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 1000));
  }
  throw lastError ?? new Error('Timed out waiting for MySQL');
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
    'run', '--name', mediaGeneratorContainer, '--entrypoint', 'ffmpeg', image,
    '-y', '-f', 'lavfi', '-i', 'color=c=black:s=16x16:d=0.1', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '/tmp/valid.mp4',
  ]);
  docker(['cp', `${mediaGeneratorContainer}:/tmp/valid.mp4`, output]);
  docker(['rm', '--force', mediaGeneratorContainer]);
  return { directory, bytes: await readFile(output) };
}

let prisma;
let validDirectory;

try {
  runDocker(['build', '-f', 'services/content-media/Dockerfile', '-t', image, '.'], { cwd: '../..' });
  docker([
    'run', '--detach', '--rm', '--name', mysqlContainer, '--publish', '127.0.0.1::3306',
    '-e', `MYSQL_ROOT_PASSWORD=${mysqlPassword}`, '-e', `MYSQL_DATABASE=${database}`, 'mysql:8.0',
  ]);
  docker([
    'run', '--detach', '--rm', '--name', minioContainer, '--publish', '127.0.0.1::9000',
    '-e', `MINIO_ROOT_USER=${accessKey}`, '-e', `MINIO_ROOT_PASSWORD=${secretKey}`,
    minioImage, 'server', '/data',
  ]);

  await waitForMysql();
  const mysqlPort = docker(['inspect', '--format', '{{(index (index .NetworkSettings.Ports "3306/tcp") 0).HostPort}}', mysqlContainer]);
  const databaseUrl = `mysql://root:${mysqlPassword}@127.0.0.1:${mysqlPort}/${database}`;
  npm(['--workspace', '@videoplayer/content-media', 'run', 'db:migrate'], { cwd: '../..', env: { ...process.env, CONTENT_DATABASE_URL: databaseUrl }, stdio: 'inherit' });
  npm(['--workspace', '@videoplayer/content-media', 'run', 'db:fixture'], { cwd: '../..', env: { ...process.env, CONTENT_DATABASE_URL: databaseUrl }, stdio: 'inherit' });
  process.env.CONTENT_DATABASE_URL = databaseUrl;
  const { PrismaClient } = await import('../generated/prisma-client/index.js');
  prisma = new PrismaClient();

  const minioPort = docker(['inspect', '--format', '{{(index (index .NetworkSettings.Ports "9000/tcp") 0).HostPort}}', minioContainer]);
  await waitForHttp(`http://127.0.0.1:${minioPort}/minio/health/live`);
  const client = new Client({ endPoint: '127.0.0.1', port: Number(minioPort), useSSL: false, accessKey, secretKey });
  await client.makeBucket(bucket);

  const state = createFixtureState();
  const videoCountBefore = await prisma.video.count();
  const assetCountBefore = await prisma.videoAsset.count();
  const fake = await createVideoAfterMediaValidation(
    state,
    { filename: 'fake.mp4', mimeType: 'video/mp4', bytes: Buffer.from('not a video'), objectKey: 'uploads/fake.mp4' },
    async () => { throw new Error('should not write database'); },
  );
  if (
    fake.status !== 400
    || (await listObjectKeys(client)).length !== 0
    || (await prisma.video.count()) !== videoCountBefore
    || (await prisma.videoAsset.count()) !== assetCountBefore
  ) throw new Error('disguised MP4 should leave zero MinIO objects and zero content rows');

  const validMp4 = await createValidMp4();
  validDirectory = validMp4.directory;
  const successObject = 'uploads/valid.mp4';
  const successVideoId = `media-valid-${process.pid}`;
  await client.putObject(bucket, successObject, validMp4.bytes, validMp4.bytes.length, { 'Content-Type': 'video/mp4' });
  const success = await createVideoAfterMediaValidation(
    state,
    { filename: 'valid.mp4', mimeType: 'video/mp4', bytes: validMp4.bytes, objectKey: successObject },
    async () => {
      const created = await prisma.video.create({
        data: {
          id: successVideoId, creatorId: '1', categoryId: 'cat-media', title: 'Real MinIO and MySQL verification',
          description: 'Created by the isolated content-media verification chain.', status: 'DRAFT',
          assets: { create: { id: `media-valid-asset-${process.pid}`, kind: 'ORIGINAL', bucket, objectKey: successObject,
            mimeType: 'video/mp4', url: `http://127.0.0.1:${minioPort}/${bucket}/${successObject}`, sizeBytes: BigInt(validMp4.bytes.length) } },
        },
      });
      return {
        id: created.id, title: created.title, description: created.description, creatorId: created.creatorId,
        categoryId: created.categoryId, status: created.status, coverUrl: created.coverUrl, playUrl: created.playUrl,
        durationSeconds: created.durationSeconds, publishedAt: created.publishedAt?.toISOString() ?? null,
        tags: [], playCount: 0, likeCount: 0, favoriteCount: 0, commentCount: 0, coinCount: 0,
        createdAt: created.createdAt.toISOString(), categoryCode: 'media', categoryName: 'Media',
      };
    },
  );
  if (
    success.status !== 201
    || !(await objectExists(client, successObject))
    || !(await prisma.video.findUnique({ where: { id: successVideoId } }))
    || !(await prisma.videoAsset.findUnique({ where: { objectKey: successObject } }))
  ) throw new Error('valid MP4 should persist one real MinIO object and one real content record');

  const failureObject = 'uploads/db-failure.mp4';
  await client.putObject(bucket, failureObject, validMp4.bytes, validMp4.bytes.length, { 'Content-Type': 'video/mp4' });
  const failure = await createVideoAfterMediaValidation(
    state,
    { filename: 'valid.mp4', mimeType: 'video/mp4', bytes: validMp4.bytes, objectKey: failureObject },
    async () => prisma.video.create({ data: { id: successVideoId, creatorId: '1', title: 'Duplicate', description: 'Force a real database conflict.' } }),
    { async probe() { return { ok: true }; } },
    { async deleteObject(targetBucket, objectKey) { await client.removeObject(targetBucket, objectKey); } },
  );
  if (
    failure.status !== 500
    || (await objectExists(client, failureObject))
    || !(await objectExists(client, successObject))
    || (await prisma.video.count()) !== videoCountBefore + 1
    || (await prisma.videoAsset.count()) !== assetCountBefore + 1
  ) throw new Error('real database failure should delete only the current MinIO object and preserve successful rows');

  process.stdout.write(
    `content-media MySQL+MinIO chain passed fakeMp4=400 validMp4=201 dbFailure=500 videos=${await prisma.video.count()} assets=${await prisma.videoAsset.count()} finalObjects=${(await listObjectKeys(client)).length}\n`,
  );
} finally {
  await prisma?.$disconnect();
  if (validDirectory) await rm(validDirectory, { recursive: true, force: true });
  for (const container of [mediaGeneratorContainer, minioContainer, mysqlContainer]) {
    try { docker(['rm', '--force', container]); } catch { /* The container may not have started. */ }
  }
}
