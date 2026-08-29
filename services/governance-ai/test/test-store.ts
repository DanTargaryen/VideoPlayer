import { GovernanceError } from '../src/errors.js';
import type {
  CreateReportInput,
  CreateReviewInput,
  GovernanceStore,
  HandleReportInput,
  ReportRecord,
  ReviewRecord,
} from '../src/types.js';

export class TestGovernanceStore implements GovernanceStore {
  isReady = true;
  closed = false;
  private nextReportId = 1;
  private nextDecisionId = 1;
  private readonly reports = new Map<number, ReportRecord>();
  private readonly decisions = new Map<number, ReviewRecord>();

  async ready() {
    return this.isReady;
  }

  async close() {
    this.closed = true;
  }

  async createOrGetReview(input: CreateReviewInput, decisionId: string) {
    const existing = [...this.decisions.values()].find((item) => item.requestId === input.requestId);
    if (existing) return existing;
    const now = new Date();
    const record: ReviewRecord = {
      id: this.nextDecisionId++,
      decisionId,
      ...input,
      videoId: input.videoId ?? null,
      decision: null,
      applyStatus: 'PENDING',
      attempts: 0,
      lastError: null,
      createdAt: now,
      updatedAt: now,
    };
    this.decisions.set(record.id, record);
    return record;
  }

  async findLatestReview(targetType: CreateReviewInput['targetType'], targetId: string) {
    return [...this.decisions.values()]
      .filter((item) => item.targetType === targetType && item.targetId === targetId)
      .sort((left, right) => right.id - left.id)[0] ?? null;
  }

  async listReviews(targetTypes: CreateReviewInput['targetType'][]) {
    return [...this.decisions.values()].filter((item) => targetTypes.includes(item.targetType)).sort((a, b) => b.id - a.id);
  }

  async decideReview(input: { reviewId: number; operatorId: number; requestId: string; action: ReviewRecord['decision']; reason?: string }) {
    const record = this.decisions.get(input.reviewId);
    if (!record) throw new GovernanceError('Review not found', 'NOT_FOUND');
    if (record.decision || record.applyStatus !== 'PENDING') throw new GovernanceError('Review already handled', 'CONFLICT');
    const updated: ReviewRecord = { ...record, requestId: input.requestId, decision: input.action, reason: input.reason ?? null, operatorId: input.operatorId, applyStatus: 'APPLY_PENDING', updatedAt: new Date() };
    this.decisions.set(updated.id, updated);
    return updated;
  }

  async createOrGetPendingReport(input: CreateReportInput, pendingKey: string) {
    const existing = [...this.reports.values()].find(
      (item) => item.pendingKey === pendingKey || item.requestId === input.requestId,
    );
    if (existing) return existing;
    const now = new Date();
    const report: ReportRecord = {
      id: this.nextReportId++,
      reporterId: input.reporterId,
      handlerId: null,
      targetType: input.targetType,
      targetId: input.targetId,
      videoId: input.videoId ?? null,
      targetSnapshot: input.targetSnapshot,
      pendingKey,
      requestId: input.requestId,
      reason: input.reason,
      status: 'PENDING',
      createdAt: now,
      updatedAt: now,
      handledAt: null,
      handleNote: null,
    };
    this.reports.set(report.id, report);
    return report;
  }

  async listReports(limit: number) {
    return [...this.reports.values()].sort((a, b) => b.id - a.id).slice(0, limit);
  }

  async deleteHandledReport(reportId: number) {
    const report = this.reports.get(reportId);
    if (!report) throw new GovernanceError('Report not found', 'NOT_FOUND');
    if (report.status === 'PENDING') throw new GovernanceError('Pending reports cannot be deleted', 'CONFLICT');
    this.reports.delete(reportId);
  }

  async dashboard() {
    return {
      pendingReviews: [...this.decisions.values()].filter((item) => item.applyStatus === 'PENDING').length,
      pendingReports: [...this.reports.values()].filter((item) => item.status === 'PENDING').length,
      retryingDecisions: [...this.decisions.values()].filter((item) => item.applyStatus === 'APPLY_FAILED_RETRYABLE').length,
    };
  }

  async handlePendingReport(input: HandleReportInput) {
    const report = this.reports.get(input.reportId);
    if (!report) throw new GovernanceError('Report not found', 'NOT_FOUND');
    if (report.status !== 'PENDING') throw new GovernanceError('Report already handled', 'CONFLICT');
    const now = new Date();
    const handled: ReportRecord = {
      ...report,
      handlerId: input.handlerId,
      pendingKey: null,
      status: input.action === 'KEEP' ? 'REJECTED' : 'PROCESSED',
      handleNote: input.reason ?? null,
      handledAt: now,
      updatedAt: now,
    };
    const decision: ReviewRecord = {
      id: this.nextDecisionId++,
      decisionId: input.decisionId,
      requestId: input.requestId,
      targetType: report.targetType,
      targetId: report.targetId,
      videoId: report.videoId ?? null,
      reportId: report.id,
      notificationRecipientId: report.reporterId,
      decision: input.action,
      applyStatus: 'APPLY_PENDING',
      attempts: 0,
      lastError: null,
      createdAt: now,
      updatedAt: now,
    };
    this.reports.set(report.id, handled);
    this.decisions.set(decision.id, decision);
    return { report: handled, decision };
  }

  async recordApplyFailure(decisionId: string, error: string, final: boolean, nextRetryAt: Date | null, leaseToken: string) {
    const decision = [...this.decisions.values()].find((item) => item.decisionId === decisionId);
    if (!decision) throw new GovernanceError('Moderation decision not found', 'NOT_FOUND');
    if (decision.applyStatus !== 'APPLYING' || decision.leaseToken !== leaseToken) return null;
    const updated: ReviewRecord = {
      ...decision,
      applyStatus: final ? 'APPLY_FAILED_FINAL' : 'APPLY_FAILED_RETRYABLE',
      attempts: decision.attempts + 1,
      lastError: error,
      nextRetryAt: final ? null : nextRetryAt,
      leaseToken: null,
      leaseExpiresAt: null,
      updatedAt: new Date(),
    };
    this.decisions.set(updated.id, updated);
    return updated;
  }

  async claimDecisionsDueForApply(now: Date, limit: number, leaseToken: string, leaseExpiresAt: Date) {
    const due = [...this.decisions.values()]
      .filter((item) =>
        item.applyStatus === 'APPLY_PENDING'
        || (item.applyStatus === 'APPLY_FAILED_RETRYABLE' && !!item.nextRetryAt && item.nextRetryAt <= now)
        || (item.applyStatus === 'APPLYING' && !!item.leaseExpiresAt && item.leaseExpiresAt <= now),
      )
      .sort((left, right) => left.id - right.id)
      .slice(0, limit);
    return due.map((decision) => {
      const claimed: ReviewRecord = { ...decision, applyStatus: 'APPLYING', leaseToken, leaseExpiresAt, updatedAt: new Date() };
      this.decisions.set(claimed.id, claimed);
      return claimed;
    });
  }

  async findDecision(decisionId: string) {
    return [...this.decisions.values()].find((item) => item.decisionId === decisionId) ?? null;
  }

  async markDecisionApplied(decisionId: string, leaseToken: string) {
    const decision = [...this.decisions.values()].find((item) => item.decisionId === decisionId);
    if (!decision) throw new GovernanceError('Moderation decision not found', 'NOT_FOUND');
    if (decision.applyStatus !== 'APPLYING' || decision.leaseToken !== leaseToken) return null;
    const updated: ReviewRecord = {
      ...decision,
      applyStatus: 'APPLIED',
      attempts: decision.attempts + 1,
      lastError: null,
      nextRetryAt: null,
      appliedAt: new Date(),
      leaseToken: null,
      leaseExpiresAt: null,
      updatedAt: new Date(),
    };
    this.decisions.set(updated.id, updated);
    return updated;
  }
}
