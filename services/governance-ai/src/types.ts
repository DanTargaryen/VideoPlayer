export const TARGET_TYPES = ['VIDEO', 'COMMENT', 'VIDEO_DANMAKU'] as const;
export type GovernanceTargetType = (typeof TARGET_TYPES)[number];

export const MODERATION_ACTIONS = ['APPROVE', 'REJECT', 'KEEP', 'HIDE', 'DELETE'] as const;
export type ModerationAction = (typeof MODERATION_ACTIONS)[number];

export type ModerationApplyStatus =
  | 'PENDING'
  | 'DECIDED'
  | 'APPLY_PENDING'
  | 'APPLYING'
  | 'APPLIED'
  | 'WITHDRAWN'
  | 'APPLY_FAILED_RETRYABLE'
  | 'APPLY_FAILED_FINAL';

export interface ReviewRecord {
  id: number;
  decisionId: string;
  requestId: string;
  targetType: GovernanceTargetType;
  targetId: string;
  videoId?: string | null;
  reportId?: number | null;
  notificationRecipientId?: number | null;
  decision: ModerationAction | null;
  reason?: string | null;
  operatorId?: number | null;
  applyStatus: ModerationApplyStatus;
  attempts: number;
  lastError: string | null;
  nextRetryAt?: Date | null;
  leaseToken?: string | null;
  leaseExpiresAt?: Date | null;
  appliedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReportRecord {
  id: number;
  reporterId: number;
  handlerId: number | null;
  targetType: GovernanceTargetType;
  targetId: string;
  videoId?: string | null;
  targetSnapshot?: unknown;
  pendingKey: string | null;
  requestId: string;
  reason: string;
  status: 'PENDING' | 'PROCESSED' | 'REJECTED';
  handleNote?: string | null;
  createdAt: Date;
  updatedAt: Date;
  handledAt: Date | null;
}

export interface VideoReviewHistoryRecord {
  id: number;
  videoId: string;
  reviewerId: number | null;
  requestId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN';
  reason: string | null;
  createdAt: Date;
  updatedAt: Date;
  reviewedAt: Date | null;
}

export interface CreateReviewInput {
  requestId: string;
  targetType: GovernanceTargetType;
  targetId: string;
  videoId?: string;
}

export interface CreateReportInput {
  reporterId: number;
  requestId: string;
  targetType: GovernanceTargetType;
  targetId: string;
  videoId?: string;
  reason: string;
  targetSnapshot?: unknown;
}

export interface HandleReportInput {
  reportId: number;
  handlerId: number;
  requestId: string;
  decisionId: string;
  action: 'KEEP' | 'DELETE';
  reason?: string;
}

export interface GovernanceStore {
  ready(): Promise<boolean>;
  close(): Promise<void>;
  createOrGetReview(input: CreateReviewInput, decisionId: string): Promise<ReviewRecord>;
  findLatestReview(targetType: GovernanceTargetType, targetId: string): Promise<ReviewRecord | null>;
  listReviews(targetTypes: GovernanceTargetType[]): Promise<ReviewRecord[]>;
  listVideoReviews(videoId: string): Promise<VideoReviewHistoryRecord[]>;
  withdrawVideoReview(videoId: string, requestId: string): Promise<ReviewRecord>;
  decideReview(input: {
    reviewId: number;
    operatorId: number;
    requestId: string;
    action: ModerationAction;
    reason?: string;
  }): Promise<ReviewRecord>;
  createOrGetPendingReport(input: CreateReportInput, pendingKey: string): Promise<ReportRecord>;
  listReports(limit: number): Promise<ReportRecord[]>;
  deleteHandledReport(reportId: number): Promise<void>;
  dashboard(): Promise<{ pendingReviews: number; pendingReports: number; retryingDecisions: number }>;
  handlePendingReport(input: HandleReportInput): Promise<{ report: ReportRecord; decision: ReviewRecord }>;
  recordApplyFailure(
    decisionId: string,
    error: string,
    final: boolean,
    nextRetryAt: Date | null,
    leaseToken: string,
  ): Promise<ReviewRecord | null>;
  claimDecisionsDueForApply(now: Date, limit: number, leaseToken: string, leaseExpiresAt: Date): Promise<ReviewRecord[]>;
  findDecision(decisionId: string): Promise<ReviewRecord | null>;
  markDecisionApplied(decisionId: string, leaseToken: string): Promise<ReviewRecord | null>;
}
