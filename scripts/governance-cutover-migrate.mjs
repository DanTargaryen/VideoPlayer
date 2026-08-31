import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const sourcePackage = require.resolve('@prisma/client', { paths: [path.join(root, 'backend')] });
const { PrismaClient: SourcePrismaClient } = require(sourcePackage);
const targetModule = await import(pathToFileURL(path.join(root, 'services/governance-ai/generated/client/index.js')).href);
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
const targetUrl = process.env.GOVERNANCE_DATABASE_URL?.trim();
const source = mysqlTarget(sourceUrl, 'DATABASE_URL');
const target = mysqlTarget(targetUrl, 'GOVERNANCE_DATABASE_URL');
if (source.target === target.target) throw new Error('source and target databases must differ');
if (process.env.GOVERNANCE_CUTOVER_CONFIRM !== 'MIGRATE_GOVERNANCE') throw new Error('GOVERNANCE_CUTOVER_CONFIRM=MIGRATE_GOVERNANCE is required');
if (!/test/i.test(target.database) && process.env.GOVERNANCE_CUTOVER_ALLOWED_TARGET !== target.target) throw new Error(`non-test governance target requires GOVERNANCE_CUTOVER_ALLOWED_TARGET=${target.target}`);

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

function reportTarget(row) {
  const id = row.targetType === 'VIDEO' ? row.videoId : row.targetType === 'COMMENT' ? row.commentId : row.danmakuId;
  assert(id !== null, `ReportRecord ${row.id} is missing its ${row.targetType} target`);
  return String(id);
}

const sourceClient = new SourcePrismaClient({ datasources: { db: { url: sourceUrl } } });
const targetClient = new TargetPrismaClient({ datasources: { db: { url: targetUrl } } });

try {
  const reviews = await sourceClient.videoReview.findMany({ orderBy: { id: 'asc' } });
  const reports = await sourceClient.reportRecord.findMany({ orderBy: { id: 'asc' } });
  const tasks = await sourceClient.commentAiTask.findMany({ orderBy: { id: 'asc' } });
  const maxReviewId = reviews.reduce((maximum, row) => Math.max(maximum, row.id), 0);

  const videoReviews = reviews.map((row) => ({
    id: row.id,
    videoId: String(row.videoId),
    reviewerId: row.reviewerId,
    requestId: `legacy-video-review-${row.id}`,
    status: row.status,
    reason: row.reason,
    createdAt: row.createdAt,
    updatedAt: row.reviewedAt ?? row.createdAt,
    reviewedAt: row.reviewedAt,
  }));
  const reviewDecisions = reviews.map((row) => ({
    id: row.id,
    decisionId: `legacy-review-decision-${row.id}`,
    requestId: `legacy-video-review-${row.id}`,
    withdrawRequestId: null,
    targetType: 'VIDEO',
    targetId: String(row.videoId),
    videoId: String(row.videoId),
    reportId: null,
    notificationRecipientId: null,
    decision: row.status === 'APPROVED' ? 'APPROVE' : row.status === 'REJECTED' ? 'REJECT' : null,
    reason: row.reason,
    operatorId: row.reviewerId,
    applyStatus: row.status === 'PENDING' ? 'PENDING' : 'APPLIED',
    attempts: row.status === 'PENDING' ? 0 : 1,
    lastError: null,
    decidedAt: row.reviewedAt,
    appliedAt: row.reviewedAt,
    nextRetryAt: null,
    leaseToken: null,
    leaseExpiresAt: null,
    createdAt: row.createdAt,
    updatedAt: row.reviewedAt ?? row.createdAt,
  }));
  const reportRows = reports.map((row) => ({
    id: row.id,
    reporterId: row.reporterId,
    handlerId: row.handlerId,
    targetType: row.targetType,
    targetId: reportTarget(row),
    videoId: row.videoId === null ? null : String(row.videoId),
    pendingKey: row.status === 'PENDING' ? row.pendingKey : null,
    requestId: `legacy-report-${row.id}`,
    reason: row.reason,
    status: row.status,
    handleNote: row.handleNote,
    createdAt: row.createdAt,
    updatedAt: row.handledAt ?? row.createdAt,
    handledAt: row.handledAt,
  }));
  const reportDecisions = reports.filter((row) => row.status !== 'PENDING').map((row) => ({
    id: maxReviewId + row.id,
    decisionId: `legacy-report-decision-${row.id}`,
    requestId: `legacy-report-decision-${row.id}`,
    withdrawRequestId: null,
    targetType: row.targetType,
    targetId: reportTarget(row),
    videoId: row.videoId === null ? null : String(row.videoId),
    reportId: row.id,
    notificationRecipientId: row.reporterId,
    decision: row.status === 'PROCESSED' ? 'DELETE' : 'KEEP',
    reason: row.handleNote,
    operatorId: row.handlerId,
    applyStatus: 'APPLIED',
    attempts: 1,
    lastError: null,
    decidedAt: row.handledAt,
    appliedAt: row.handledAt,
    nextRetryAt: null,
    leaseToken: null,
    leaseExpiresAt: null,
    createdAt: row.createdAt,
    updatedAt: row.handledAt ?? row.createdAt,
  }));
  const taskRows = tasks.map((row) => ({
    id: row.id,
    targetType: 'COMMENT',
    targetId: String(row.commentId),
    videoId: String(row.videoId),
    requesterId: row.requesterId,
    requestId: `legacy-comment-ai-task-${row.id}`,
    prompt: row.prompt,
    status: row.status,
    attempts: row.attempts,
    lastError: row.errorMessage,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    completedAt: ['SUCCESS', 'FAILED'].includes(row.status) ? row.updatedAt : null,
  }));
  const sourceRows = {
    VideoReview: videoReviews,
    CommentAiTask: taskRows,
    ReportRecord: reportRows,
    ModerationDecision: [...reviewDecisions, ...reportDecisions].sort((left, right) => left.id - right.id),
  };

  assertUnique(sourceRows.VideoReview, ['requestId'], 'VideoReview');
  assertUnique(sourceRows.CommentAiTask, ['requestId'], 'CommentAiTask');
  assertUnique(sourceRows.ReportRecord, ['requestId'], 'ReportRecord');
  assertUnique(sourceRows.ModerationDecision, ['decisionId'], 'ModerationDecision');
  assertUnique(sourceRows.ModerationDecision, ['requestId'], 'ModerationDecision');

  for (const name of ['VideoReview', 'CommentAiTask', 'ReportRecord', 'ModerationDecision']) {
    const delegate = name[0].toLowerCase() + name.slice(1);
    const rows = sourceRows[name];
    if (rows.length) await targetClient[delegate].createMany({ data: rows, skipDuplicates: true });
  }
  for (const name of ['VideoReview', 'CommentAiTask', 'ReportRecord', 'ModerationDecision']) {
    const delegate = name[0].toLowerCase() + name.slice(1);
    const expected = [...sourceRows[name]].sort((left, right) => left.id - right.id);
    const actual = await targetClient[delegate].findMany({ orderBy: { id: 'asc' } });
    const fields = expected[0] ? Object.keys(expected[0]) : [];
    const projected = actual.map((row) => Object.fromEntries(fields.map((field) => [field, row[field]])));
    assert.deepEqual(normalized(projected), normalized(expected), `${name} target rows differ from source mapping`);
    console.log(`${name}: ${actual.length}/${expected.length} rows verified`);
  }
  console.log(`Governance cutover migration verified: ${source.target} -> ${target.target}`);
} finally {
  await Promise.allSettled([sourceClient.$disconnect(), targetClient.$disconnect()]);
}
