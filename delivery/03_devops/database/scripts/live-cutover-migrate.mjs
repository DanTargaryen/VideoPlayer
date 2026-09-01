import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const sourcePackage = require.resolve('@prisma/client', { paths: [path.join(root, 'backend')] });
const { PrismaClient: SourcePrismaClient } = require(sourcePackage);
const targetModule = await import(pathToFileURL(path.join(root, 'services/live-reward/generated/index.js')).href);
const { PrismaClient: TargetPrismaClient } = targetModule;

function mysqlTarget(value, name) {
  if (!value) throw new Error(`${name} is required`);
  const parsed = new URL(value);
  if (parsed.protocol !== 'mysql:') throw new Error(`${name} must be a mysql URL`);
  const database = parsed.pathname.replace(/^\//, '');
  if (!database) throw new Error(`${name} must include a database`);
  return { database, target: `${parsed.hostname}:${parsed.port || '3306'}/${database}` };
}

const sourceUrl = process.env.DATABASE_URL?.trim();
const targetUrl = process.env.LIVE_REWARD_DATABASE_URL?.trim();
const source = mysqlTarget(sourceUrl, 'DATABASE_URL');
const target = mysqlTarget(targetUrl, 'LIVE_REWARD_DATABASE_URL');
if (source.target === target.target) throw new Error('source and target databases must differ');
if (process.env.LIVE_CUTOVER_CONFIRM !== 'MIGRATE_LIVE_REWARD') throw new Error('LIVE_CUTOVER_CONFIRM=MIGRATE_LIVE_REWARD is required');
if (!/test/i.test(target.database) && process.env.LIVE_CUTOVER_ALLOWED_TARGET !== target.target) throw new Error(`non-test live target requires LIVE_CUTOVER_ALLOWED_TARGET=${target.target}`);

function normalized(value) {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'bigint') return value.toString();
  if (Array.isArray(value)) return value.map(normalized);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, normalized(item)]));
  return value;
}

function assertUnique(rows, fields, name) {
  const seen = new Set();
  for (const row of rows) {
    const key = JSON.stringify(fields.map((field) => normalized(row[field])));
    assert(!seen.has(key), `${name} has duplicate ${fields.join('+')}: ${key}`);
    seen.add(key);
  }
}

const sourceClient = new SourcePrismaClient({ datasources: { db: { url: sourceUrl } } });
const targetClient = new TargetPrismaClient({ datasources: { db: { url: targetUrl } } });

try {
  const users = await sourceClient.user.findMany({ select: { id: true, coinBalance: true, createdAt: true, updatedAt: true }, orderBy: { id: 'asc' } });
  const transactions = await sourceClient.coinTransaction.findMany({ orderBy: { id: 'asc' } });
  const sourceRows = {
    CoinAccount: users.map((row) => ({ id: row.id, userId: row.id, balance: row.coinBalance, createdAt: row.createdAt, updatedAt: row.updatedAt })),
    DailyCoinClaim: await sourceClient.dailyCoinClaim.findMany({ orderBy: { id: 'asc' } }),
    StreakMilestoneClaim: await sourceClient.streakMilestoneClaim.findMany({ orderBy: { id: 'asc' } }),
    VideoCoinContribution: (await sourceClient.videoCoinContribution.findMany({ orderBy: { id: 'asc' } })).map((row) => ({ ...row, videoId: String(row.videoId) })),
    CoinTransaction: transactions.map((row) => ({
      id: row.id,
      userId: row.userId,
      type: row.type,
      amount: row.amount,
      balanceAfter: row.balanceAfter,
      videoId: row.videoId === null ? null : String(row.videoId),
      requestId: `legacy-coin-transaction-${row.id}`,
      requestPayload: `legacy:${row.userId}:${row.type}:${row.videoId ?? ''}:${row.amount}:${row.balanceAfter}`,
      createdAt: row.createdAt,
    })),
  };

  assertUnique(sourceRows.CoinAccount, ['userId'], 'CoinAccount');
  assertUnique(sourceRows.DailyCoinClaim, ['userId', 'claimDate'], 'DailyCoinClaim');
  assertUnique(sourceRows.StreakMilestoneClaim, ['userId', 'milestone'], 'StreakMilestoneClaim');
  assertUnique(sourceRows.VideoCoinContribution, ['videoId', 'userId'], 'VideoCoinContribution');
  assertUnique(sourceRows.CoinTransaction, ['requestId'], 'CoinTransaction');

  const order = ['CoinAccount', 'DailyCoinClaim', 'StreakMilestoneClaim', 'VideoCoinContribution', 'CoinTransaction'];
  for (const name of order) {
    const delegate = name[0].toLowerCase() + name.slice(1);
    const rows = sourceRows[name];
    if (rows.length) await targetClient[delegate].createMany({ data: rows, skipDuplicates: true });
  }
  for (const name of order) {
    const delegate = name[0].toLowerCase() + name.slice(1);
    const expected = [...sourceRows[name]].sort((left, right) => left.id - right.id);
    const actual = await targetClient[delegate].findMany({ orderBy: { id: 'asc' } });
    const fields = expected[0] ? Object.keys(expected[0]) : [];
    const projected = actual.map((row) => Object.fromEntries(fields.map((field) => [field, row[field]])));
    assert.deepEqual(normalized(projected), normalized(expected), `${name} target rows differ from source mapping`);
    console.log(`${name}: ${actual.length}/${expected.length} rows verified`);
  }
  console.log(`Live-reward cutover migration verified: ${source.target} -> ${target.target}`);
} finally {
  await Promise.allSettled([sourceClient.$disconnect(), targetClient.$disconnect()]);
}
