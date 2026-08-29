import { Prisma, PrismaClient } from '../generated/client/index.js';

import { GovernanceError } from './errors.js';
import type {
  CreateReportInput,
  CreateReviewInput,
  GovernanceStore,
  HandleReportInput,
  ReportRecord,
  ReviewRecord,
  GovernanceTargetType,
  ModerationAction,
} from './types.js';

function isUniqueError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

export class PrismaGovernanceStore implements GovernanceStore {
  constructor(private readonly prisma = new PrismaClient()) {}

  async ready(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  close() {
    return this.prisma.$disconnect();
  }

  async createOrGetReview(input: CreateReviewInput, decisionId: string): Promise<ReviewRecord> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const decision = await tx.moderationDecision.create({
          data: {
            decisionId,
            requestId: input.requestId,
            targetType: input.targetType,
            targetId: input.targetId,
            videoId: input.videoId,
            applyStatus: 'PENDING',
          },
        });
        if (input.targetType === 'VIDEO') {
          await tx.videoReview.create({ data: { videoId: input.targetId, requestId: input.requestId } });
        }
        return decision;
      });
    } catch (error) {
      if (isUniqueError(error)) {
        const existing = await this.prisma.moderationDecision.findUnique({ where: { requestId: input.requestId } });
        if (existing) {
          if (existing.targetType !== input.targetType || existing.targetId !== input.targetId) {
            throw new GovernanceError('requestId was already used for a different review target', 'CONFLICT');
          }
          return existing;
        }
      }
      throw error;
    }
  }

  findLatestReview(inputType: CreateReviewInput['targetType'], targetId: string): Promise<ReviewRecord | null> {
    return this.prisma.moderationDecision.findFirst({
      where: { targetType: inputType, targetId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
  }

  listReviews(targetTypes: GovernanceTargetType[]): Promise<ReviewRecord[]> {
    return this.prisma.moderationDecision.findMany({
      where: { targetType: { in: targetTypes } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 100,
    });
  }

  async decideReview(input: { reviewId: number; operatorId: number; requestId: string; action: ModerationAction; reason?: string }) {
    const existing = await this.prisma.moderationDecision.findUnique({ where: { id: input.reviewId } });
    if (!existing) throw new GovernanceError('Review not found', 'NOT_FOUND');
    if (existing.decision || existing.applyStatus !== 'PENDING') throw new GovernanceError('Review already handled', 'CONFLICT');
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.moderationDecision.updateMany({
        where: { id: input.reviewId, applyStatus: 'PENDING', decision: null },
        data: { requestId: input.requestId, decision: input.action, reason: input.reason?.trim() || null, operatorId: input.operatorId, applyStatus: 'APPLY_PENDING', decidedAt: now },
      });
      if (updated.count !== 1) throw new GovernanceError('Review already handled', 'CONFLICT');
      if (existing.targetType === 'VIDEO') {
        await tx.videoReview.updateMany({
          where: { requestId: existing.requestId, status: 'PENDING' },
          data: { reviewerId: input.operatorId, status: input.action === 'APPROVE' ? 'APPROVED' : 'REJECTED', reason: input.reason?.trim() || null, reviewedAt: now },
        });
      }
    });
    return this.prisma.moderationDecision.findUniqueOrThrow({ where: { id: input.reviewId } });
  }

  async createOrGetPendingReport(input: CreateReportInput, pendingKey: string): Promise<ReportRecord> {
    const existing = await this.prisma.reportRecord.findUnique({ where: { pendingKey } });
    if (existing) return existing;
    try {
      return await this.prisma.reportRecord.create({
        data: {
          reporterId: input.reporterId,
          requestId: input.requestId,
          targetType: input.targetType,
          targetId: input.targetId,
          videoId: input.videoId,
          targetSnapshot:
            input.targetSnapshot === undefined
              ? undefined
              : input.targetSnapshot === null
                ? Prisma.JsonNull
                : (input.targetSnapshot as Prisma.InputJsonValue),
          pendingKey,
          reason: input.reason,
        },
      });
    } catch (error) {
      if (isUniqueError(error)) {
        const requestRecord = await this.prisma.reportRecord.findUnique({ where: { requestId: input.requestId } });
        if (requestRecord) {
          if (
            requestRecord.reporterId !== input.reporterId ||
            requestRecord.targetType !== input.targetType ||
            requestRecord.targetId !== input.targetId
          ) {
            throw new GovernanceError('requestId was already used for a different report', 'CONFLICT');
          }
          return requestRecord;
        }
        const pendingWinner = await this.prisma.reportRecord.findUnique({ where: { pendingKey } });
        if (pendingWinner) return pendingWinner;
      }
      throw error;
    }
  }

  listReports(limit: number): Promise<ReportRecord[]> {
    return this.prisma.reportRecord.findMany({ orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: limit });
  }

  async deleteHandledReport(reportId: number): Promise<void> {
    const report = await this.prisma.reportRecord.findUnique({ where: { id: reportId } });
    if (!report) throw new GovernanceError('Report not found', 'NOT_FOUND');
    if (report.status === 'PENDING') throw new GovernanceError('Pending reports cannot be deleted', 'CONFLICT');
    await this.prisma.reportRecord.delete({ where: { id: reportId } });
  }

  async dashboard() {
    const [pendingReviews, pendingReports, retryingDecisions] = await Promise.all([
      this.prisma.moderationDecision.count({ where: { applyStatus: 'PENDING', decision: null } }),
      this.prisma.reportRecord.count({ where: { status: 'PENDING' } }),
      this.prisma.moderationDecision.count({ where: { applyStatus: 'APPLY_FAILED_RETRYABLE' } }),
    ]);
    return { pendingReviews, pendingReports, retryingDecisions };
  }

  async handlePendingReport(input: HandleReportInput): Promise<{ report: ReportRecord; decision: ReviewRecord }> {
    return this.prisma.$transaction(async (tx) => {
      const report = await tx.reportRecord.findUnique({ where: { id: input.reportId } });
      if (!report) throw new GovernanceError('Report not found', 'NOT_FOUND');
      if (report.status !== 'PENDING') throw new GovernanceError('Report already handled', 'CONFLICT');

      const claimed = await tx.reportRecord.updateMany({
        where: { id: input.reportId, status: 'PENDING' },
        data: {
          status: input.action === 'KEEP' ? 'REJECTED' : 'PROCESSED',
          handlerId: input.handlerId,
          handleNote: input.reason?.trim() || null,
          pendingKey: null,
          handledAt: new Date(),
        },
      });
      if (claimed.count !== 1) throw new GovernanceError('Report already handled', 'CONFLICT');

      const decision = await tx.moderationDecision.create({
        data: {
          decisionId: input.decisionId,
          requestId: input.requestId,
          targetType: report.targetType,
          targetId: report.targetId,
          videoId: report.videoId,
          reportId: report.id,
          notificationRecipientId: report.reporterId,
          decision: input.action,
          reason: input.reason?.trim() || null,
          operatorId: input.handlerId,
          applyStatus: 'APPLY_PENDING',
          decidedAt: new Date(),
        },
      });
      const handled = await tx.reportRecord.findUniqueOrThrow({ where: { id: input.reportId } });
      return { report: handled, decision };
    });
  }

  async recordApplyFailure(decisionId: string, error: string, final: boolean, nextRetryAt: Date | null) {
    const decision = await this.prisma.moderationDecision.findUnique({ where: { decisionId } });
    if (!decision) throw new GovernanceError('Moderation decision not found', 'NOT_FOUND');
    if (decision.applyStatus === 'APPLIED' || decision.applyStatus === 'APPLY_FAILED_FINAL') {
      throw new GovernanceError('Moderation decision is no longer retryable', 'CONFLICT');
    }
    return this.prisma.moderationDecision.update({
      where: { decisionId },
      data: {
        applyStatus: final ? 'APPLY_FAILED_FINAL' : 'APPLY_FAILED_RETRYABLE',
        attempts: { increment: 1 },
        lastError: error,
        nextRetryAt: final ? null : nextRetryAt,
      },
    });
  }

  listDecisionsDueForApply(now: Date, limit: number): Promise<ReviewRecord[]> {
    return this.prisma.moderationDecision.findMany({
      where: {
        OR: [
          { applyStatus: 'APPLY_PENDING' },
          { applyStatus: 'APPLY_FAILED_RETRYABLE', nextRetryAt: { lte: now } },
        ],
      },
      orderBy: [{ nextRetryAt: 'asc' }, { createdAt: 'asc' }],
      take: limit,
    });
  }

  async markDecisionApplied(decisionId: string): Promise<ReviewRecord> {
    const updated = await this.prisma.moderationDecision.updateMany({
      where: {
        decisionId,
        applyStatus: { in: ['APPLY_PENDING', 'APPLY_FAILED_RETRYABLE'] },
      },
      data: {
        applyStatus: 'APPLIED',
        attempts: { increment: 1 },
        lastError: null,
        nextRetryAt: null,
        appliedAt: new Date(),
      },
    });
    if (updated.count !== 1) throw new GovernanceError('Moderation decision is no longer retryable', 'CONFLICT');
    return this.prisma.moderationDecision.findUniqueOrThrow({ where: { decisionId } });
  }
}
