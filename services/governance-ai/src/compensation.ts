import { ContentApplyError, type ContentModerationClient } from './content-client.js';
import type { GovernanceStore, ReviewRecord } from './types.js';

export interface CompensationResult {
  decisionId: string;
  status: ReviewRecord['applyStatus'];
}

export interface ModerationCompensatorOptions {
  maxAttempts?: number;
  retryDelayMs?: number;
  batchSize?: number;
}

export class ModerationCompensator {
  private readonly maxAttempts: number;
  private readonly retryDelayMs: number;
  private readonly batchSize: number;

  constructor(
    private readonly store: GovernanceStore,
    private readonly content: ContentModerationClient,
    options: ModerationCompensatorOptions = {},
  ) {
    this.maxAttempts = options.maxAttempts ?? 5;
    this.retryDelayMs = options.retryDelayMs ?? 30_000;
    this.batchSize = options.batchSize ?? 20;
  }

  async runOnce(now = new Date()): Promise<CompensationResult[]> {
    const decisions = await this.store.listDecisionsDueForApply(now, this.batchSize);
    return Promise.all(decisions.map((decision) => this.applyOne(decision, now)));
  }

  private async applyOne(decision: ReviewRecord, now: Date): Promise<CompensationResult> {
    try {
      await this.content.apply(decision);
      const applied = await this.store.markDecisionApplied(decision.decisionId);
      return { decisionId: decision.decisionId, status: applied.applyStatus };
    } catch (error) {
      const retryable = error instanceof ContentApplyError ? error.retryable : true;
      const final = !retryable || decision.attempts + 1 >= this.maxAttempts;
      const nextRetryAt = final ? null : new Date(now.getTime() + this.retryDelayMs * 2 ** decision.attempts);
      const message = error instanceof Error ? error.message : String(error);
      const failed = await this.store.recordApplyFailure(decision.decisionId, message, final, nextRetryAt);
      return { decisionId: decision.decisionId, status: failed.applyStatus };
    }
  }
}
