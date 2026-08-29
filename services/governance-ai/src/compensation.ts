import { randomUUID } from 'node:crypto';

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
  leaseMs?: number;
}

export class ModerationCompensator {
  private readonly maxAttempts: number;
  private readonly retryDelayMs: number;
  private readonly batchSize: number;
  private readonly leaseMs: number;

  constructor(
    private readonly store: GovernanceStore,
    private readonly content: ContentModerationClient,
    options: ModerationCompensatorOptions = {},
  ) {
    this.maxAttempts = options.maxAttempts ?? 5;
    this.retryDelayMs = options.retryDelayMs ?? 30_000;
    this.batchSize = options.batchSize ?? 20;
    this.leaseMs = options.leaseMs ?? 60_000;
  }

  async runOnce(now = new Date()): Promise<CompensationResult[]> {
    const leaseToken = randomUUID();
    const decisions = await this.store.claimDecisionsDueForApply(now, this.batchSize, leaseToken, new Date(now.getTime() + this.leaseMs));
    return Promise.all(decisions.map((decision) => this.applyOne(decision, now, leaseToken)));
  }

  private async currentResult(decisionId: string): Promise<CompensationResult> {
    const current = await this.store.findDecision(decisionId);
    if (!current) throw new Error(`Moderation decision ${decisionId} disappeared`);
    return { decisionId, status: current.applyStatus };
  }

  private async applyOne(decision: ReviewRecord, now: Date, leaseToken: string): Promise<CompensationResult> {
    try {
      await this.content.apply(decision);
    } catch (error) {
      const retryable = error instanceof ContentApplyError ? error.retryable : true;
      const final = !retryable || decision.attempts + 1 >= this.maxAttempts;
      const nextRetryAt = final ? null : new Date(now.getTime() + this.retryDelayMs * 2 ** decision.attempts);
      const message = error instanceof Error ? error.message : String(error);
      const failed = await this.store.recordApplyFailure(decision.decisionId, message, final, nextRetryAt, leaseToken);
      return failed ? { decisionId: decision.decisionId, status: failed.applyStatus } : this.currentResult(decision.decisionId);
    }
    const applied = await this.store.markDecisionApplied(decision.decisionId, leaseToken);
    return applied ? { decisionId: decision.decisionId, status: applied.applyStatus } : this.currentResult(decision.decisionId);
  }
}
