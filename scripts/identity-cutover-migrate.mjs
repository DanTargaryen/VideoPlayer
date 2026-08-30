import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const sourcePackage = require.resolve('@prisma/client', { paths: [path.join(root, 'backend')] });
const targetPackage = require.resolve('@prisma/client', { paths: [path.join(root, 'services', 'identity-community')] });
const { PrismaClient: SourcePrismaClient } = require(sourcePackage);
const { PrismaClient: TargetPrismaClient } = require(targetPackage);

const sourceUrl = process.env.DATABASE_URL?.trim();
const targetUrl = process.env.IDENTITY_DATABASE_URL?.trim();

function mysqlTarget(value, name) {
  if (!value) throw new Error(`${name} is required`);
  const parsed = new URL(value);
  if (parsed.protocol !== 'mysql:') throw new Error(`${name} must be a mysql URL`);
  const database = parsed.pathname.replace(/^\//, '');
  if (!database) throw new Error(`${name} must include a database`);
  return { parsed, database, target: `${parsed.hostname}:${parsed.port || '3306'}/${database}` };
}

const source = mysqlTarget(sourceUrl, 'DATABASE_URL');
const target = mysqlTarget(targetUrl, 'IDENTITY_DATABASE_URL');
if (source.parsed.toString() === target.parsed.toString()) throw new Error('source and target databases must differ');
if (process.env.IDENTITY_CUTOVER_CONFIRM !== 'MIGRATE_IDENTITY') {
  throw new Error('IDENTITY_CUTOVER_CONFIRM=MIGRATE_IDENTITY is required');
}
if (!/test/i.test(target.database) && process.env.IDENTITY_CUTOVER_ALLOWED_TARGET !== target.target) {
  throw new Error(`non-test identity target requires IDENTITY_CUTOVER_ALLOWED_TARGET=${target.target}`);
}

const definitions = [
  { name: 'User', delegate: 'user', fields: ['id', 'username', 'email', 'password', 'role', 'nickname', 'phone', 'avatarUrl', 'bio', 'messagePrivacy', 'createdAt', 'updatedAt'], target: (row) => ({ ...pick(row, ['id', 'username', 'email', 'password', 'role', 'nickname', 'phone', 'avatarUrl', 'bio', 'messagePrivacy', 'createdAt', 'updatedAt']), sessionNonce: null }) },
  { name: 'UserProfileSummary', delegate: 'userProfileSummary', fields: ['id', 'userId', 'activityScore', 'activityLevel', 'behaviorSignalCount', 'viewerScore', 'creatorScore', 'creatorViewerTendency', 'isColdStart', 'createdAt', 'updatedAt'] },
  { name: 'UserCategoryPreference', delegate: 'userCategoryPreference', fields: ['id', 'userId', 'categoryId', 'score', 'createdAt', 'updatedAt'] },
  { name: 'UserCreatorPreference', delegate: 'userCreatorPreference', fields: ['id', 'userId', 'creatorId', 'score', 'createdAt', 'updatedAt'] },
  { name: 'DirectMessage', delegate: 'directMessage', fields: ['id', 'senderId', 'recipientId', 'content', 'isRead', 'readAt', 'createdAt', 'updatedAt'] },
  { name: 'DynamicPost', delegate: 'dynamicPost', fields: ['id', 'authorId', 'content', 'imageUrls', 'status', 'likeCount', 'commentCount', 'favoriteCount', 'createdAt', 'updatedAt'] },
  { name: 'DynamicPostLike', delegate: 'dynamicPostLike', fields: ['id', 'postId', 'userId', 'createdAt'] },
  { name: 'DynamicPostComment', delegate: 'dynamicPostComment', fields: ['id', 'postId', 'userId', 'content', 'status', 'createdAt', 'updatedAt'] },
  { name: 'FollowRelation', delegate: 'followRelation', fields: ['id', 'followerId', 'followingId', 'createdAt'] },
  { name: 'Notification', delegate: 'notification', fields: ['id', 'recipientId', 'actorId', 'type', 'title', 'content', 'relatedType', 'relatedId', 'isRead', 'createdAt', 'updatedAt'], target: (row) => ({ ...pick(row, ['id', 'recipientId', 'actorId', 'type', 'title', 'content', 'relatedType', 'relatedId', 'isRead', 'createdAt', 'updatedAt']), requestId: null }) },
  { name: 'CreatorFollowerDaily', delegate: 'creatorFollowerDaily', fields: ['id', 'creatorId', 'statDate', 'followerCount', 'createdAt', 'updatedAt'] },
];

function pick(row, fields) {
  return Object.fromEntries(fields.map((field) => [field, row[field]]));
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

const sourceClient = new SourcePrismaClient({ datasources: { db: { url: sourceUrl } } });
const targetClient = new TargetPrismaClient({ datasources: { db: { url: targetUrl } } });

try {
  const sourceRows = new Map();
  for (const definition of definitions) {
    const rows = await sourceClient[definition.delegate].findMany({ orderBy: { id: 'asc' } });
    sourceRows.set(definition.name, rows);
  }

  const users = sourceRows.get('User');
  assertUnique(users, ['username'], 'User');
  assertUnique(users, ['email'], 'User');
  assertUnique(users, ['phone'], 'User');
  assertUnique(sourceRows.get('UserCategoryPreference'), ['userId', 'categoryId'], 'UserCategoryPreference');
  assertUnique(sourceRows.get('UserCreatorPreference'), ['userId', 'creatorId'], 'UserCreatorPreference');
  assertUnique(sourceRows.get('DynamicPostLike'), ['postId', 'userId'], 'DynamicPostLike');
  assertUnique(sourceRows.get('FollowRelation'), ['followerId', 'followingId'], 'FollowRelation');
  assertUnique(sourceRows.get('CreatorFollowerDaily'), ['creatorId', 'statDate'], 'CreatorFollowerDaily');

  for (const definition of definitions) {
    const rows = sourceRows.get(definition.name);
    const data = rows.map((row) => definition.target ? definition.target(row) : pick(row, definition.fields));
    if (data.length) await targetClient[definition.delegate].createMany({ data, skipDuplicates: true });
  }

  for (const definition of definitions) {
    const expected = sourceRows.get(definition.name).map((row) => normalized(pick(row, definition.fields)));
    const actualRows = await targetClient[definition.delegate].findMany({ orderBy: { id: 'asc' } });
    const actual = actualRows.map((row) => normalized(pick(row, definition.fields)));
    assert.deepEqual(actual, expected, `${definition.name} target rows differ from source`);
    console.log(`${definition.name}: ${actual.length}/${expected.length} rows verified`);
  }

  console.log(`Identity cutover migration verified: ${source.target} -> ${target.target}`);
} finally {
  await Promise.allSettled([sourceClient.$disconnect(), targetClient.$disconnect()]);
}
