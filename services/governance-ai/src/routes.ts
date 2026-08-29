import { randomUUID } from 'node:crypto';

import { authorizeServiceRequest, failure, ok, type ServiceRequestContext } from '@videoplayer/shared-contracts';

import { GovernanceApplication } from './application.js';
import { ContentApplyError, type ContentModerationClient, type ModerationTargetSnapshot } from './content-client.js';
import { GovernanceError } from './errors.js';
import { TARGET_TYPES, type GovernanceTargetType, type ModerationAction, type ReportRecord, type ReviewRecord } from './types.js';

const MAX_BODY_BYTES = 32 * 1024;

async function readJson(request: ServiceRequestContext['request']): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_BODY_BYTES) throw new GovernanceError('Request body is too large', 'VALIDATION');
    chunks.push(buffer);
  }
  try {
    const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not object');
    return parsed as Record<string, unknown>;
  } catch {
    throw new GovernanceError('Request body must be a JSON object', 'VALIDATION');
  }
}

function textValue(value: unknown, field: string): string {
  if ((typeof value !== 'string' && typeof value !== 'number') || !String(value).trim()) throw new GovernanceError(`${field} is required`, 'VALIDATION');
  return String(value).trim();
}

function targetType(value: unknown): GovernanceTargetType {
  if (typeof value !== 'string' || !TARGET_TYPES.includes(value as GovernanceTargetType)) throw new GovernanceError('targetType is invalid', 'VALIDATION');
  return value as GovernanceTargetType;
}

function authorizeInternal(context: ServiceRequestContext, secret: string, scope: string): void {
  const claims = authorizeServiceRequest(context.request.headers.authorization, {
    audience: 'governance-ai', secret, requiredScopes: [scope], allowedCallers: ['content-media'],
  });
  if (claims.requestId !== context.requestId) throw new Error('Service JWT requestId does not match x-request-id');
}

interface Principal { id: number; nickname: string; role: string }

function decodeTrustedNickname(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    throw new Error('Trusted user context is invalid');
  }
}

function principal(context: ServiceRequestContext, secret: string, admin = false): Principal {
  const claims = authorizeServiceRequest(context.request.headers['x-gateway-authorization'], {
    audience: 'governance-ai', secret, requiredScopes: ['governance.user.forward'], allowedCallers: ['gateway'],
  });
  if (claims.requestId !== context.requestId) throw new Error('Gateway JWT requestId does not match x-request-id');
  const id = Number(context.request.headers['x-user-id']);
  const nickname = decodeTrustedNickname(String(context.request.headers['x-user-nickname'] ?? '')).trim();
  const role = String(context.request.headers['x-user-role'] ?? 'USER').trim().toUpperCase();
  if (!Number.isInteger(id) || id < 1 || !nickname) throw new Error('Trusted user context is invalid');
  if (admin && role !== 'ADMIN') throw new GovernanceError('Admin required', 'FORBIDDEN');
  return { id, nickname, role };
}

function errorResponse(context: ServiceRequestContext, error: unknown): void {
  if (error instanceof GovernanceError) {
    const status = error.code === 'VALIDATION' ? 400 : error.code === 'NOT_FOUND' ? 404 : error.code === 'FORBIDDEN' ? 403 : 409;
    context.writeJson(status, failure(error.message, context.requestId, status));
  } else if (error instanceof ContentApplyError) {
    const status = error.status === 404 ? 404 : error.retryable ? 503 : 400;
    context.writeJson(status, failure(error.message, context.requestId, status));
  } else if (error instanceof Error && /JWT|Authorization|scope|caller|Trusted user|Gateway JWT/.test(error.message)) {
    context.writeJson(401, failure(error.message, context.requestId, 401));
  } else {
    context.writeJson(500, failure('internal governance error', context.requestId, 500));
  }
}

function reviewStatus(record: ReviewRecord): 'PENDING' | 'APPROVED' | 'REJECTED' {
  if (!record.decision) return 'PENDING';
  return record.decision === 'APPROVE' || record.decision === 'KEEP' ? 'APPROVED' : 'REJECTED';
}

function reviewItem(record: ReviewRecord, snapshot?: ModerationTargetSnapshot) {
  return {
    ...record,
    status: reviewStatus(record),
    reviewedAt: record.decision ? record.updatedAt : null,
    reviewer: record.operatorId ? { id: record.operatorId, nickname: `管理员#${record.operatorId}` } : null,
    video: record.targetType === 'VIDEO' ? snapshot ?? null : snapshot?.video ?? null,
    content: snapshot?.content,
    user: snapshot?.user ?? null,
  };
}

function reportItem(record: ReportRecord) {
  const snapshot = record.targetSnapshot && typeof record.targetSnapshot === 'object' ? record.targetSnapshot as Record<string, unknown> : null;
  return {
    ...record,
    reporter: { id: record.reporterId, nickname: `用户#${record.reporterId}` },
    handler: record.handlerId ? { id: record.handlerId, nickname: `管理员#${record.handlerId}` } : null,
    video: record.targetType === 'VIDEO' ? snapshot : snapshot?.video ?? null,
    comment: record.targetType === 'COMMENT' ? snapshot : null,
    danmaku: record.targetType === 'VIDEO_DANMAKU' ? snapshot : null,
  };
}

export function createGovernanceRoute(application: GovernanceApplication, secret: string, content?: ContentModerationClient | null, runCompensation?: () => Promise<unknown>) {
  const lookup = async (type: GovernanceTargetType, id: string, requestId: string) => {
    if (!content?.getTarget) throw new ContentApplyError('content target lookup is not configured', true);
    return content.getTarget(type, id, requestId);
  };

  return async (context: ServiceRequestContext): Promise<boolean> => {
    const internalLatest = context.path.match(/^\/internal\/v1\/reviews\/(VIDEO|COMMENT|VIDEO_DANMAKU)\/([^/]+)\/latest$/);
    const adminReport = context.path.match(/^\/api\/v1\/admin\/reports\/(\d+)$/);
    const adminVideoReview = context.path.match(/^\/api\/v1\/admin\/reviews\/videos\/(\d+)$/);
    const adminTextReview = context.path.match(/^\/api\/v1\/admin\/reviews\/text-content\/(COMMENT|VIDEO_DANMAKU)\/([^/]+)$/);
    try {
      if (context.method === 'POST' && context.path === '/internal/v1/reviews') {
        authorizeInternal(context, secret, 'governance.reviews.write');
        const body = await readJson(context.request);
        const type = targetType(body.targetType);
        const id = textValue(body.targetId, 'targetId');
        const record = await application.submitReview({ requestId: context.requestId, targetType: type, targetId: id, videoId: body.videoId === undefined ? undefined : textValue(body.videoId, 'videoId') });
        context.writeJson(200, ok(record, context.requestId)); return true;
      }
      if (context.method === 'GET' && internalLatest) {
        authorizeInternal(context, secret, 'governance.reviews.read');
        const record = await application.latestReview(internalLatest[1] as GovernanceTargetType, decodeURIComponent(internalLatest[2]));
        if (!record) throw new GovernanceError('Review not found', 'NOT_FOUND');
        context.writeJson(200, ok(record, context.requestId)); return true;
      }
      if (context.method === 'POST' && context.path === '/api/v1/reports') {
        const user = principal(context, secret);
        const body = await readJson(context.request);
        const type = targetType(body.targetType);
        const id = textValue(body.targetId, 'targetId');
        const snapshot = await lookup(type, id, context.requestId);
        const record = await application.createReport({ reporterId: user.id, requestId: context.requestId, targetType: type, targetId: id, videoId: snapshot.videoId, reason: textValue(body.reason, 'reason'), targetSnapshot: snapshot });
        context.writeJson(200, ok(reportItem(record), context.requestId)); return true;
      }
      if (context.method === 'GET' && context.path === '/api/v1/admin/reports') {
        principal(context, secret, true);
        context.writeJson(200, ok((await application.listReports()).map(reportItem), context.requestId)); return true;
      }
      if (context.method === 'POST' && adminReport) {
        const admin = principal(context, secret, true);
        const body = await readJson(context.request);
        const action = textValue(body.action, 'action');
        if (action !== 'KEEP' && action !== 'DELETE') throw new GovernanceError('action is invalid', 'VALIDATION');
        const result = await application.handleReport({ reportId: Number(adminReport[1]), handlerId: admin.id, requestId: context.requestId, decisionId: randomUUID(), action, reason: typeof body.reason === 'string' ? body.reason : undefined });
        await runCompensation?.();
        context.writeJson(200, ok({ report: reportItem(result.report), decision: (await application.latestReview(result.decision.targetType, result.decision.targetId)) ?? result.decision }, context.requestId)); return true;
      }
      if (context.method === 'DELETE' && adminReport) {
        principal(context, secret, true);
        context.writeJson(200, ok(await application.deleteReport(Number(adminReport[1])), context.requestId)); return true;
      }
      if (context.method === 'GET' && context.path === '/api/v1/admin/reviews/videos') {
        principal(context, secret, true);
        const records = await application.listReviews(['VIDEO']);
        const items = await Promise.all(records.map(async (record) => reviewItem(record, await lookup(record.targetType, record.targetId, `${context.requestId}:${record.id}`.slice(0, 128)).catch(() => undefined))));
        context.writeJson(200, ok(items, context.requestId)); return true;
      }
      if (context.method === 'POST' && adminVideoReview) {
        const admin = principal(context, secret, true);
        const body = await readJson(context.request);
        const action = textValue(body.action, 'action');
        if (action !== 'APPROVE' && action !== 'REJECT') throw new GovernanceError('action is invalid', 'VALIDATION');
        const record = await application.decideReview({ reviewId: Number(adminVideoReview[1]), operatorId: admin.id, requestId: context.requestId, action, reason: typeof body.reason === 'string' ? body.reason : undefined });
        await runCompensation?.();
        context.writeJson(200, ok(reviewItem((await application.latestReview(record.targetType, record.targetId)) ?? record), context.requestId)); return true;
      }
      if (context.method === 'GET' && context.path === '/api/v1/admin/reviews/text-content') {
        principal(context, secret, true);
        const query = new URL(context.request.url ?? '/', 'http://127.0.0.1').searchParams.get('targetType');
        const types: GovernanceTargetType[] = query ? [targetType(query)] : ['COMMENT', 'VIDEO_DANMAKU'];
        const records = await application.listReviews(types);
        const items = await Promise.all(records.map(async (record) => reviewItem(record, await lookup(record.targetType, record.targetId, `${context.requestId}:${record.id}`.slice(0, 128)).catch(() => undefined))));
        context.writeJson(200, ok(items, context.requestId)); return true;
      }
      if (context.method === 'POST' && adminTextReview) {
        const admin = principal(context, secret, true);
        const body = await readJson(context.request);
        const action = textValue(body.action, 'action') as ModerationAction;
        if (!['KEEP', 'HIDE', 'DELETE'].includes(action)) throw new GovernanceError('action is invalid', 'VALIDATION');
        const pending = (await application.listReviews([adminTextReview[1] as GovernanceTargetType])).find((item) => item.targetId === decodeURIComponent(adminTextReview[2]) && !item.decision);
        if (!pending) throw new GovernanceError('Review not found', 'NOT_FOUND');
        const record = await application.decideReview({ reviewId: pending.id, operatorId: admin.id, requestId: context.requestId, action, reason: typeof body.reason === 'string' ? body.reason : undefined });
        await runCompensation?.();
        context.writeJson(200, ok(reviewItem((await application.latestReview(record.targetType, record.targetId)) ?? record), context.requestId)); return true;
      }
      if (context.method === 'GET' && context.path === '/api/v1/admin/dashboard') {
        principal(context, secret, true);
        context.writeJson(200, ok(await application.dashboard(), context.requestId)); return true;
      }
      if (context.method === 'POST' && context.path === '/api/v1/agent/review-preview') {
        principal(context, secret, true);
        const body = await readJson(context.request);
        const contentText = textValue(body.content, 'content');
        const hits = ['暴力', '诈骗', '色情', '辱骂'].filter((word) => contentText.includes(word));
        context.writeJson(200, ok({ targetType: textValue(body.targetType, 'targetType'), riskLevel: hits.length ? 'HIGH' : 'LOW', suggestedAction: hits.length ? 'REJECT' : 'MANUAL_REVIEW', summary: hits.length ? '命中本地安全规则，建议人工复核。' : '未命中本地安全规则，保留人工审核。', hitRules: hits, mode: 'RULES_ONLY' }, context.requestId)); return true;
      }
      return false;
    } catch (error) {
      errorResponse(context, error);
      return true;
    }
  };
}
