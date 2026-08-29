import { randomUUID } from 'node:crypto';

import { GovernanceError } from './errors.js';
import {
  MODERATION_ACTIONS,
  TARGET_TYPES,
  type CreateReportInput,
  type CreateReviewInput,
  type GovernanceStore,
  type GovernanceTargetType,
  type HandleReportInput,
  type ModerationAction,
} from './types.js';

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

function requirePositiveInteger(value: number, field: string): void {
  if (!Number.isInteger(value) || value < 1) throw new GovernanceError(`${field} must be a positive integer`, 'VALIDATION');
}

function requireExternalId(value: string, field: string): void {
  if (typeof value !== 'string' || value.trim().length < 1 || value.length > 191) {
    throw new GovernanceError(`${field} must be a non-empty external ID`, 'VALIDATION');
  }
}

function requireRequestId(value: string): void {
  if (!REQUEST_ID_PATTERN.test(value)) throw new GovernanceError('requestId is invalid', 'VALIDATION');
}

export class GovernanceApplication {
  constructor(private readonly store: GovernanceStore) {}

  submitReview(input: CreateReviewInput) {
    requireRequestId(input.requestId);
    requireExternalId(input.targetId, 'targetId');
    if (input.videoId !== undefined) requireExternalId(input.videoId, 'videoId');
    if (!TARGET_TYPES.includes(input.targetType)) throw new GovernanceError('targetType is invalid', 'VALIDATION');
    return this.store.createOrGetReview(
      { ...input, videoId: input.targetType === 'VIDEO' ? input.targetId : input.videoId },
      randomUUID(),
    );
  }

  latestReview(targetType: GovernanceTargetType, targetId: string) {
    if (!TARGET_TYPES.includes(targetType)) throw new GovernanceError('targetType is invalid', 'VALIDATION');
    requireExternalId(targetId, 'targetId');
    return this.store.findLatestReview(targetType, targetId);
  }

  listReviews(targetTypes: GovernanceTargetType[]) {
    if (!targetTypes.length || targetTypes.some((item) => !TARGET_TYPES.includes(item))) {
      throw new GovernanceError('targetType is invalid', 'VALIDATION');
    }
    return this.store.listReviews(targetTypes);
  }

  decideReview(input: { reviewId: number; operatorId: number; requestId: string; action: ModerationAction; reason?: string }) {
    requirePositiveInteger(input.reviewId, 'reviewId');
    requirePositiveInteger(input.operatorId, 'operatorId');
    requireRequestId(input.requestId);
    if (!MODERATION_ACTIONS.includes(input.action)) throw new GovernanceError('action is invalid', 'VALIDATION');
    if (input.reason !== undefined && input.reason.trim().length > 255) throw new GovernanceError('reason is too long', 'VALIDATION');
    return this.store.decideReview({ ...input, reason: input.reason?.trim() });
  }

  createReport(input: CreateReportInput) {
    requirePositiveInteger(input.reporterId, 'reporterId');
    requireExternalId(input.targetId, 'targetId');
    if (input.videoId !== undefined) requireExternalId(input.videoId, 'videoId');
    requireRequestId(input.requestId);
    if (!TARGET_TYPES.includes(input.targetType)) throw new GovernanceError('targetType is invalid', 'VALIDATION');
    const reason = input.reason.trim();
    if (reason.length < 2 || reason.length > 255) {
      throw new GovernanceError('reason must contain between 2 and 255 characters', 'VALIDATION');
    }
    const pendingKey = `${input.reporterId}:${input.targetType}:${input.targetId}`;
    return this.store.createOrGetPendingReport(
      { ...input, reason, videoId: input.targetType === 'VIDEO' ? input.targetId : input.videoId },
      pendingKey,
    );
  }

  handleReport(input: HandleReportInput) {
    requirePositiveInteger(input.reportId, 'reportId');
    requirePositiveInteger(input.handlerId, 'handlerId');
    requireRequestId(input.requestId);
    requireRequestId(input.decisionId);
    if (!MODERATION_ACTIONS.includes(input.action)) throw new GovernanceError('action is invalid', 'VALIDATION');
    return this.store.handlePendingReport(input);
  }

  listReports(limit = 50) {
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new GovernanceError('limit is invalid', 'VALIDATION');
    return this.store.listReports(limit);
  }

  async deleteReport(reportId: number) {
    requirePositiveInteger(reportId, 'reportId');
    await this.store.deleteHandledReport(reportId);
    return { deleted: true, reportId };
  }

  dashboard() {
    return this.store.dashboard();
  }

  recordApplyFailure(decisionId: string, error: string, leaseToken: string, final = false, nextRetryAt: Date | null = null) {
    requireRequestId(decisionId);
    const message = error.trim().slice(0, 1024);
    if (!message) throw new GovernanceError('error is required', 'VALIDATION');
    if (final && nextRetryAt) throw new GovernanceError('final failures cannot have nextRetryAt', 'VALIDATION');
    return this.store.recordApplyFailure(decisionId, message, final, nextRetryAt, leaseToken);
  }
}
