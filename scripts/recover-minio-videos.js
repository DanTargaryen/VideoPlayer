#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const Minio = require('minio');

const ROOT_DIR = path.resolve(__dirname, '..');
const ENV_PATH = path.join(ROOT_DIR, 'backend/.env');
const { PrismaClient } = require(path.join(ROOT_DIR, 'backend/node_modules/@prisma/client'));

const VIDEO_EXTENSIONS = new Set(['.mp4', '.m4v', '.mov', '.webm']);
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const DEFAULT_COVER_URL =
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80';
const DEFAULT_NEAR_COVER_WINDOW_MS = 5 * 60 * 1000;

function parseArgs(argv) {
  const args = {
    apply: false,
    includeOrphans: false,
    category: 'entertainment',
    status: 'PUBLISHED',
    creator: '',
    limit: 0,
    nearCoverWindowMs: DEFAULT_NEAR_COVER_WINDOW_MS,
  };

  for (const item of argv) {
    if (item === '--apply') {
      args.apply = true;
    } else if (item === '--dry-run') {
      args.apply = false;
    } else if (item === '--include-orphans') {
      args.includeOrphans = true;
    } else if (item.startsWith('--creator=')) {
      args.creator = item.slice('--creator='.length).trim();
    } else if (item.startsWith('--category=')) {
      args.category = item.slice('--category='.length).trim();
    } else if (item.startsWith('--status=')) {
      args.status = item.slice('--status='.length).trim().toUpperCase();
    } else if (item.startsWith('--limit=')) {
      args.limit = Number(item.slice('--limit='.length)) || 0;
    } else if (item.startsWith('--near-cover-window-ms=')) {
      args.nearCoverWindowMs = Number(item.slice('--near-cover-window-ms='.length)) || DEFAULT_NEAR_COVER_WINDOW_MS;
    } else if (item === '--help' || item === '-h') {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${item}`);
    }
  }

  if (!['DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED'].includes(args.status)) {
    throw new Error(`Invalid --status=${args.status}`);
  }

  if (!['entertainment', 'study', 'game', 'tech'].includes(args.category)) {
    throw new Error(`Invalid --category=${args.category}`);
  }

  return args;
}

function printHelp() {
  console.log(`Recover videos from MinIO objects into Prisma records.

Usage:
  node scripts/recover-minio-videos.js --dry-run
  node scripts/recover-minio-videos.js --apply

Options:
  --apply                    Write missing Video and VideoAsset records.
  --dry-run                  Preview only. This is the default.
  --include-orphans          Also restore original videos without a matched cover or transcoded file.
  --creator=<id|username>    Attach recovered videos to this user. Defaults to recovered_videos.
  --category=<code>          entertainment, study, game, or tech. Default: entertainment.
  --status=<status>          PUBLISHED, DRAFT, PENDING_REVIEW, or REJECTED. Default: PUBLISHED.
  --limit=<n>                Restore at most n candidates.
`);
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const env = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) {
      continue;
    }

    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[match[1]] = value;
  }

  return env;
}

function applyEnv(env) {
  for (const [key, value] of Object.entries(env)) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function buildMinioClient(env) {
  const endPoint = env.MINIO_ENDPOINT || '127.0.0.1';
  const port = Number(env.MINIO_PORT || 9000);
  const useSSL = String(env.MINIO_USE_SSL || 'false') === 'true';

  return new Minio.Client({
    endPoint,
    port,
    useSSL,
    accessKey: env.MINIO_ROOT_USER || 'minioadmin',
    secretKey: env.MINIO_ROOT_PASSWORD || 'minioadmin',
  });
}

function getBucket(env) {
  return env.MINIO_BUCKET || 'video-player';
}

function getPublicBaseUrl(env) {
  if (env.MINIO_PUBLIC_BASE_URL) {
    return env.MINIO_PUBLIC_BASE_URL.replace(/\/$/, '');
  }

  const endPoint = env.MINIO_ENDPOINT || '127.0.0.1';
  const port = Number(env.MINIO_PORT || 9000);
  const useSSL = String(env.MINIO_USE_SSL || 'false') === 'true';
  return `${useSSL ? 'https' : 'http'}://${endPoint}:${port}`;
}

function objectUrl(env, objectKey) {
  return `${getPublicBaseUrl(env)}/${getBucket(env)}/${objectKey}`;
}

function listObjects(client, bucket) {
  return new Promise((resolve, reject) => {
    const objects = [];
    const stream = client.listObjectsV2(bucket, '', true);

    stream.on('data', (item) => {
      if (!item.name) {
        return;
      }
      objects.push({
        name: item.name,
        size: Number(item.size || 0),
        lastModified: item.lastModified ? new Date(item.lastModified) : null,
      });
    });
    stream.on('error', reject);
    stream.on('end', () => resolve(objects));
  });
}

function isVideoObject(objectKey) {
  return VIDEO_EXTENSIONS.has(path.extname(objectKey).toLowerCase());
}

function isImageObject(objectKey) {
  return IMAGE_EXTENSIONS.has(path.extname(objectKey).toLowerCase());
}

function isOriginalVideoObject(objectKey) {
  return (
    (objectKey.startsWith('videos/original/') || objectKey.startsWith('videos/recordings/')) &&
    isVideoObject(objectKey)
  );
}

function deriveObjectKey(originalKey, folder, extension) {
  const baseName = path.basename(originalKey).replace(/\.[^.]+$/, `.${extension}`);
  return originalKey
    .replace('/original/', `/${folder}/`)
    .replace('/recordings/', `/${folder}/`)
    .replace(path.basename(originalKey), baseName);
}

function getDirectory(objectKey) {
  return objectKey.slice(0, objectKey.lastIndexOf('/'));
}

function leadingTimestamp(objectKey) {
  const match = path.basename(objectKey).match(/^(\d{10,})-/);
  return match ? Number(match[1]) : null;
}

function buildCoverIndexes(objects) {
  const covers = objects.filter((item) => item.name.startsWith('videos/covers/') && isImageObject(item.name));
  const byKey = new Map(covers.map((item) => [item.name, item]));
  const byDirectory = new Map();

  for (const cover of covers) {
    const timestamp = leadingTimestamp(cover.name);
    if (!timestamp) {
      continue;
    }

    const dir = getDirectory(cover.name);
    const items = byDirectory.get(dir) || [];
    items.push({ ...cover, timestamp });
    byDirectory.set(dir, items);
  }

  for (const items of byDirectory.values()) {
    items.sort((left, right) => left.timestamp - right.timestamp);
  }

  return { byKey, byDirectory };
}

function findExactCover(originalKey, coverIndex) {
  for (const extension of ['jpg', 'jpeg', 'png', 'webp', 'gif']) {
    const candidate = deriveObjectKey(originalKey, 'covers', extension);
    if (coverIndex.byKey.has(candidate)) {
      return coverIndex.byKey.get(candidate);
    }
  }

  return null;
}

function findNearCover(original, coverIndex, usedCoverKeys, windowMs) {
  const timestamp = leadingTimestamp(original.name);
  if (!timestamp) {
    return null;
  }

  const coverDir = getDirectory(original.name)
    .replace('/original/', '/covers/')
    .replace('/recordings/', '/covers/');
  const covers = coverIndex.byDirectory.get(coverDir) || [];
  let best = null;

  for (const cover of covers) {
    if (usedCoverKeys.has(cover.name)) {
      continue;
    }

    const distance = Math.abs(cover.timestamp - timestamp);
    if (distance > windowMs) {
      continue;
    }

    if (!best || distance < best.distance) {
      best = { cover, distance };
    }
  }

  return best?.cover ?? null;
}

function displayTitleFromObjectKey(objectKey) {
  const raw = path.basename(objectKey).replace(/\.[^.]+$/, '');
  const withoutTimestamp = raw.replace(/^\d{10,}-/, '');
  const withoutUuid = withoutTimestamp.replace(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    '恢复视频',
  );
  const title = withoutUuid
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return (title || `恢复视频 ${leadingTimestamp(objectKey) || ''}`).slice(0, 128);
}

function originalNameFromObjectKey(objectKey) {
  return path.basename(objectKey).replace(/^\d{10,}-/, '').slice(0, 255);
}

function mimeTypeFromObjectKey(objectKey, fallback) {
  const ext = path.extname(objectKey).toLowerCase();
  const index = {
    '.mp4': 'video/mp4',
    '.m4v': 'video/x-m4v',
    '.mov': 'video/quicktime',
    '.webm': 'video/webm',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
  };

  return index[ext] || fallback;
}

async function resolveCreator(prisma, creatorArg, apply) {
  if (creatorArg) {
    const numericId = Number(creatorArg);
    const user = Number.isInteger(numericId)
      ? await prisma.user.findUnique({ where: { id: numericId } })
      : await prisma.user.findUnique({ where: { username: creatorArg } });

    if (!user) {
      throw new Error(`Creator not found: ${creatorArg}`);
    }

    return user;
  }

  const existing = await prisma.user.findUnique({ where: { username: 'recovered_videos' } });
  if (existing) {
    return existing;
  }

  if (!apply) {
    return {
      id: null,
      username: 'recovered_videos',
      nickname: '恢复视频',
    };
  }

  return prisma.user.create({
    data: {
      username: 'recovered_videos',
      email: 'recovered_videos@local.invalid',
      password: `Recovered-${Date.now()}`,
      role: 'USER',
      nickname: '恢复视频',
      bio: '由 MinIO 对象恢复的视频归属账号。',
    },
  });
}

async function buildRecoveryPlan(prisma, env, objects, args) {
  const bucket = getBucket(env);
  const objectByKey = new Map(objects.map((item) => [item.name, item]));
  const coverIndex = buildCoverIndexes(objects);
  const usedCoverKeys = new Set();
  const existingAssets = await prisma.videoAsset.findMany({
    select: {
      objectKey: true,
    },
  });
  const existingVideos = await prisma.video.findMany({
    select: {
      uploadToken: true,
    },
  });
  const existingObjectKeys = new Set([
    ...existingAssets.map((item) => item.objectKey),
    ...existingVideos.map((item) => item.uploadToken),
  ]);

  const originalObjects = objects
    .filter((item) => isOriginalVideoObject(item.name))
    .sort((left, right) => left.name.localeCompare(right.name));

  const skippedExisting = [];
  const orphanOriginals = [];
  const candidates = [];

  for (const original of originalObjects) {
    if (existingObjectKeys.has(original.name)) {
      skippedExisting.push(original);
      continue;
    }

    const transcodedKey = deriveObjectKey(original.name, 'transcoded', 'mp4');
    const transcoded = objectByKey.get(transcodedKey) || null;
    const exactCover = findExactCover(original.name, coverIndex);
    const nearCover = exactCover ? null : findNearCover(original, coverIndex, usedCoverKeys, args.nearCoverWindowMs);
    const cover = exactCover || nearCover;

    if (cover) {
      usedCoverKeys.add(cover.name);
    }

    const hasCompletedSignal = Boolean(transcoded || cover);
    if (!hasCompletedSignal && !args.includeOrphans) {
      orphanOriginals.push(original);
      continue;
    }

    const playObject = transcoded || original;
    const coverUrl = cover ? objectUrl(env, cover.name) : DEFAULT_COVER_URL;

    candidates.push({
      original,
      transcoded,
      cover,
      video: {
        title: displayTitleFromObjectKey(original.name),
        description: `由 MinIO 对象恢复：${original.name}`,
        category: args.category,
        coverUrl,
        playUrl: objectUrl(env, playObject.name),
        status: args.status,
        uploadToken: original.name,
        publishedAt: args.status === 'PUBLISHED' ? original.lastModified || new Date() : null,
        submittedAt: null,
      },
      assets: [
        {
          assetType: original.name.startsWith('videos/recordings/') ? 'RECORDING' : 'ORIGINAL',
          objectKey: original.name,
          bucket,
          mimeType: mimeTypeFromObjectKey(original.name, 'video/mp4'),
          originalName: originalNameFromObjectKey(original.name),
          fileSize: original.size,
          url: objectUrl(env, original.name),
        },
        ...(cover
          ? [
              {
                assetType: 'COVER',
                objectKey: cover.name,
                bucket,
                mimeType: mimeTypeFromObjectKey(cover.name, 'image/jpeg'),
                originalName: originalNameFromObjectKey(cover.name),
                fileSize: cover.size,
                url: objectUrl(env, cover.name),
              },
            ]
          : []),
        ...(transcoded
          ? [
              {
                assetType: 'TRANSCODED',
                objectKey: transcoded.name,
                bucket,
                mimeType: mimeTypeFromObjectKey(transcoded.name, 'video/mp4'),
                originalName: originalNameFromObjectKey(transcoded.name),
                fileSize: transcoded.size,
                url: objectUrl(env, transcoded.name),
              },
            ]
          : []),
      ],
    });
  }

  return {
    originalObjects,
    skippedExisting,
    orphanOriginals,
    candidates: args.limit > 0 ? candidates.slice(0, args.limit) : candidates,
    totalCandidatesBeforeLimit: candidates.length,
  };
}

async function applyPlan(prisma, creator, plan) {
  const created = [];
  const skipped = [];

  for (const item of plan.candidates) {
    const existing = await prisma.video.findFirst({
      where: {
        OR: [
          { uploadToken: item.original.name },
          {
            assets: {
              some: {
                objectKey: item.original.name,
              },
            },
          },
        ],
      },
      select: { id: true },
    });

    if (existing) {
      skipped.push(item.original.name);
      continue;
    }

    const video = await prisma.$transaction(async (tx) => {
      const createdVideo = await tx.video.create({
        data: {
          creatorId: creator.id,
          ...item.video,
        },
      });

      await tx.videoAsset.createMany({
        data: item.assets.map((asset) => ({
          ...asset,
          videoId: createdVideo.id,
        })),
        skipDuplicates: true,
      });

      return createdVideo;
    });

    created.push({
      id: video.id,
      title: video.title,
      uploadToken: video.uploadToken,
    });
  }

  return { created, skipped };
}

function printPlan(plan, creator, args) {
  const preview = plan.candidates.slice(0, 20).map((item) => ({
    title: item.video.title,
    original: item.original.name,
    play: item.transcoded ? item.transcoded.name : item.original.name,
    cover: item.cover?.name || '(default cover)',
  }));

  console.log(
    JSON.stringify(
      {
        mode: args.apply ? 'apply' : 'dry-run',
        creator: {
          id: creator.id,
          username: creator.username,
          nickname: creator.nickname,
        },
        summary: {
          totalOriginalVideoObjects: plan.originalObjects.length,
          skippedExisting: plan.skippedExisting.length,
          restorableCandidates: plan.totalCandidatesBeforeLimit,
          selectedCandidates: plan.candidates.length,
          orphanOriginalsNotSelected: plan.orphanOriginals.length,
        },
        preview,
        hint: args.apply ? undefined : 'Preview only. Re-run with --apply to write records.',
      },
      null,
      2,
    ),
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const env = loadEnvFile(ENV_PATH);
  applyEnv(env);

  const prisma = new PrismaClient();
  const minio = buildMinioClient(env);
  const bucket = getBucket(env);

  try {
    const [objects, creator] = await Promise.all([
      listObjects(minio, bucket),
      resolveCreator(prisma, args.creator, args.apply),
    ]);
    const plan = await buildRecoveryPlan(prisma, env, objects, args);
    printPlan(plan, creator, args);

    if (!args.apply) {
      return;
    }

    if (!creator.id) {
      throw new Error('Creator id is required in apply mode.');
    }

    const result = await applyPlan(prisma, creator, plan);
    console.log(
      JSON.stringify(
        {
          createdCount: result.created.length,
          skippedDuringApply: result.skipped.length,
          firstCreated: result.created.slice(0, 20),
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
