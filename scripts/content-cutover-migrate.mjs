import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const sourcePackage = require.resolve('@prisma/client', { paths: [path.join(root, 'backend')] });
const { PrismaClient: SourcePrismaClient } = require(sourcePackage);
const targetModule = await import(pathToFileURL(path.join(root, 'services/content-media/generated/prisma-client/index.js')).href);
const { PrismaClient: TargetPrismaClient } = targetModule;

const sourceUrl = process.env.DATABASE_URL?.trim();
const targetUrl = process.env.CONTENT_DATABASE_URL?.trim();

function mysqlTarget(value, name) {
  if (!value) throw new Error(`${name} is required`);
  const parsed = new URL(value);
  if (parsed.protocol !== 'mysql:') throw new Error(`${name} must be a mysql URL`);
  const database = parsed.pathname.replace(/^\//, '');
  if (!database) throw new Error(`${name} must include a database`);
  return { parsed, database, target: `${parsed.hostname}:${parsed.port || '3306'}/${database}` };
}

const source = mysqlTarget(sourceUrl, 'DATABASE_URL');
const target = mysqlTarget(targetUrl, 'CONTENT_DATABASE_URL');
if (source.target === target.target) throw new Error('source and target databases must differ');
if (process.env.CONTENT_CUTOVER_CONFIRM !== 'MIGRATE_CONTENT') throw new Error('CONTENT_CUTOVER_CONFIRM=MIGRATE_CONTENT is required');
if (!/test/i.test(target.database) && process.env.CONTENT_CUTOVER_ALLOWED_TARGET !== target.target) {
  throw new Error(`non-test content target requires CONTENT_CUTOVER_ALLOWED_TARGET=${target.target}`);
}

function normalized(value) {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'bigint') return value.toString();
  if (Array.isArray(value)) return value.map(normalized);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, normalized(item)]));
  return value;
}

function assertUnique(rows, fields, label) {
  const seen = new Set();
  for (const row of rows) {
    const values = fields.map((field) => row[field]);
    if (values.some((value) => value === null || value === undefined)) continue;
    const key = JSON.stringify(values.map(normalized));
    assert(!seen.has(key), `${label} has duplicate ${fields.join('+')}: ${key}`);
    seen.add(key);
  }
}

function textStatus(value) {
  return value === 'NORMAL' ? 'VISIBLE' : 'HIDDEN';
}

function assetKind(value) {
  return value === 'RECORDING' ? 'REPLAY' : value;
}

const sourceClient = new SourcePrismaClient({ datasources: { db: { url: sourceUrl } } });
const targetClient = new TargetPrismaClient({ datasources: { db: { url: targetUrl } } });

try {
  const sourceVideos = await sourceClient.video.findMany({ include: { categories: { orderBy: { id: 'asc' } } }, orderBy: { id: 'asc' } });
  const categoryCodes = [...new Set(sourceVideos.flatMap((video) => video.categories.map((category) => category.code).concat(video.category || [])))].sort();
  const categories = categoryCodes.map((code, index) => ({ id: `cat-${code}`, code, name: code, sortOrder: (index + 1) * 10 }));
  const primaryCategory = new Map(sourceVideos.map((video) => [video.id, video.category ?? video.categories[0]?.code ?? null]));

  const sourceRows = {
    VideoCategory: categories,
    Video: sourceVideos.map((video) => ({
      id: String(video.id), creatorId: String(video.creatorId), categoryId: primaryCategory.get(video.id) ? `cat-${primaryCategory.get(video.id)}` : null,
      title: video.title, description: video.description, status: video.status, coverUrl: video.coverUrl, playUrl: video.playUrl,
      durationSeconds: video.durationSeconds, playCount: video.playCount, likeCount: video.likeCount,
      favoriteCount: video.favoriteCount, commentCount: video.commentCount, coinCount: video.coinCount,
      legacyUploadToken: video.uploadToken, legacyCategory: video.category,
      tags: [...new Set(video.categories.map((category) => category.code).concat(video.category || []))], publishedAt: video.publishedAt, submittedAt: video.submittedAt,
      reviewSubmissionRequestId: null, reviewDecisionId: null, reviewDecision: null, reviewDecisionReason: video.rejectReason,
      createdAt: video.createdAt, updatedAt: video.updatedAt,
    })),
    VideoAsset: (await sourceClient.videoAsset.findMany({ orderBy: { id: 'asc' } })).map((row) => ({
      id: String(row.id), videoId: row.videoId === null ? null : String(row.videoId), kind: assetKind(row.assetType), bucket: row.bucket, objectKey: row.objectKey,
      requestId: null, mimeType: row.mimeType, originalName: row.originalName, url: row.url, sizeBytes: BigInt(row.fileSize), createdAt: row.createdAt, updatedAt: row.updatedAt,
    })),
    UserVideoWatch: (await sourceClient.userVideoWatch.findMany({ orderBy: { id: 'asc' } })).map((row) => ({
      id: String(row.id), userId: String(row.userId), videoId: String(row.videoId), progressSeconds: row.lastWatchDurationSeconds,
      completed: row.completedCount > 0, playCount: row.playCount, totalWatchDurationSeconds: row.totalWatchDurationSeconds,
      lastWatchDurationSeconds: row.lastWatchDurationSeconds, videoDurationSeconds: row.videoDurationSeconds,
      maxWatchRatio: row.maxWatchRatio, lastWatchRatio: row.lastWatchRatio, completedCount: row.completedCount,
      lastWatchedAt: row.lastWatchedAt, createdAt: row.createdAt, updatedAt: row.updatedAt,
    })),
    Comment: (await sourceClient.comment.findMany({ orderBy: { id: 'asc' } })).map((row) => ({
      id: String(row.id), videoId: String(row.videoId), userId: String(row.userId), parentId: row.parentId === null ? null : String(row.parentId),
      rootId: row.rootId === null ? null : String(row.rootId), body: row.content, imageUrl: row.imageUrl, status: textStatus(row.status),
      replyCount: row.replyCount, createdAt: row.createdAt, updatedAt: row.updatedAt,
    })),
    VideoLike: (await sourceClient.videoLike.findMany({ orderBy: { id: 'asc' } })).map((row) => ({ id: String(row.id), videoId: String(row.videoId), userId: String(row.userId), requestId: null, createdAt: row.createdAt })),
    FavoriteFolder: (await sourceClient.favoriteFolder.findMany({ orderBy: { id: 'asc' } })).map((row) => ({ id: String(row.id), userId: String(row.userId), name: row.name, isDefault: row.isDefault, createdAt: row.createdAt, updatedAt: row.updatedAt })),
    Favorite: (await sourceClient.favorite.findMany({ orderBy: { id: 'asc' } })).map((row) => ({ id: String(row.id), userId: String(row.userId), videoId: String(row.videoId), folderId: row.folderId === null ? null : String(row.folderId), requestId: null, createdAt: row.createdAt })),
    VideoDanmaku: (await sourceClient.videoDanmaku.findMany({ orderBy: { id: 'asc' } })).map((row) => ({ id: String(row.id), videoId: String(row.videoId), userId: String(row.userId), body: row.content, offsetSeconds: Math.floor(row.timeOffsetMs / 1000), timeOffsetMs: row.timeOffsetMs, color: row.color, status: textStatus(row.status), createdAt: row.createdAt })),
    CreatorPlayDaily: (await sourceClient.creatorPlayDaily.findMany({ orderBy: { id: 'asc' } })).map((row) => ({ id: String(row.id), creatorId: String(row.creatorId), date: new Date(`${row.statDate}T00:00:00.000Z`), plays: row.playCount, createdAt: row.createdAt, updatedAt: row.updatedAt })),
    VideoAiSummary: (await sourceClient.videoAiSummary.findMany({ orderBy: { id: 'asc' } })).map((row) => ({ id: String(row.id), videoId: String(row.videoId), summary: row.summary, status: 'READY', frameCount: row.frameCount, model: row.model, createdAt: row.createdAt, updatedAt: row.updatedAt })),
    VideoAiChatSession: (await sourceClient.videoAiChatSession.findMany({ orderBy: { id: 'asc' } })).map((row) => ({ id: String(row.id), videoId: String(row.videoId), userId: String(row.userId), createdAt: row.createdAt, updatedAt: row.updatedAt })),
    VideoAiChatMessage: (await sourceClient.videoAiChatMessage.findMany({ orderBy: { id: 'asc' } })).map((row) => ({ id: String(row.id), sessionId: String(row.sessionId), role: row.role, content: row.content, model: row.model, frameCount: row.frameCount, createdAt: row.createdAt })),
  };

  assertUnique(sourceRows.VideoCategory, ['code'], 'VideoCategory');
  assertUnique(sourceRows.Video, ['legacyUploadToken'], 'Video');
  assertUnique(sourceRows.VideoAsset, ['objectKey'], 'VideoAsset');
  assertUnique(sourceRows.UserVideoWatch, ['userId', 'videoId'], 'UserVideoWatch');
  assertUnique(sourceRows.VideoLike, ['videoId', 'userId'], 'VideoLike');
  assertUnique(sourceRows.FavoriteFolder, ['userId', 'name'], 'FavoriteFolder');
  assertUnique(sourceRows.Favorite, ['videoId', 'userId'], 'Favorite');
  assertUnique(sourceRows.VideoAiChatSession, ['userId', 'videoId'], 'VideoAiChatSession');

  const order = ['VideoCategory', 'Video', 'VideoAsset', 'UserVideoWatch', 'Comment', 'VideoLike', 'FavoriteFolder', 'Favorite', 'VideoDanmaku', 'CreatorPlayDaily', 'VideoAiSummary', 'VideoAiChatSession', 'VideoAiChatMessage'];
  for (const name of order) {
    const delegate = name[0].toLowerCase() + name.slice(1);
    const rows = sourceRows[name];
    if (rows.length) await targetClient[delegate].createMany({ data: rows, skipDuplicates: true });
  }

  for (const name of order) {
    const delegate = name[0].toLowerCase() + name.slice(1);
    const expected = [...sourceRows[name]].sort((left, right) => String(left.id).localeCompare(String(right.id)));
    const actual = await targetClient[delegate].findMany({ orderBy: { id: 'asc' } });
    const fields = expected[0] ? Object.keys(expected[0]) : [];
    const projected = actual.map((row) => Object.fromEntries(fields.map((field) => [field, row[field]])));
    assert.deepEqual(normalized(projected), normalized(expected), `${name} target rows differ from source mapping`);
    console.log(`${name}: ${actual.length}/${expected.length} rows verified`);
  }

  console.log(`Content cutover migration verified: ${source.target} -> ${target.target}`);
} finally {
  await Promise.allSettled([sourceClient.$disconnect(), targetClient.$disconnect()]);
}
