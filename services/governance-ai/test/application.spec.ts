import { describe, expect, it } from 'vitest';

import { GovernanceApplication } from '../src/application.js';
import { TestGovernanceStore } from './test-store.js';

describe('governance domain', () => {
  it('collapses concurrent reports for the same reporter and target', async () => {
    const application = new GovernanceApplication(new TestGovernanceStore());
    const reports = await Promise.all(
      Array.from({ length: 12 }, (_, index) =>
        application.createReport({
          reporterId: 7,
          requestId: `report-concurrent-${index}`,
          targetType: 'VIDEO',
          targetId: '91',
          reason: '违规内容',
        }),
      ),
    );
    expect(new Set(reports.map((report) => report.id))).toEqual(new Set([1]));
  });

  it('releases the pending key, rejects repeated handling and retains an unapplied decision', async () => {
    const store = new TestGovernanceStore();
    const application = new GovernanceApplication(store);
    const report = await application.createReport({
      reporterId: 7,
      requestId: 'report-first',
      targetType: 'COMMENT',
      targetId: '92',
      reason: '不当内容',
    });
    const handled = await application.handleReport({
      reportId: report.id,
      handlerId: 2,
      requestId: 'handle-first',
      decisionId: 'decision-first',
      action: 'DELETE',
      reason: '确认违规',
    });
    expect(handled.report.pendingKey).toBeNull();
    expect(handled.decision.applyStatus).toBe('APPLY_PENDING');
    await expect(
      application.handleReport({
        reportId: report.id,
        handlerId: 2,
        requestId: 'handle-again',
        decisionId: 'decision-again',
        action: 'KEEP',
      }),
    ).rejects.toThrow('Report already handled');

    const next = await application.createReport({
      reporterId: 7,
      requestId: 'report-second',
      targetType: 'COMMENT',
      targetId: '92',
      reason: '再次举报',
    });
    expect(next.id).not.toBe(report.id);
  });

  it('audits retryable and final application failures without marking a decision applied', async () => {
    const store = new TestGovernanceStore();
    const application = new GovernanceApplication(store);
    const report = await application.createReport({
      reporterId: 8,
      requestId: 'report-retry',
      targetType: 'VIDEO_DANMAKU',
      targetId: '93',
      reason: '需要处理',
    });
    await application.handleReport({
      reportId: report.id,
      handlerId: 2,
      requestId: 'handle-retry',
      decisionId: 'decision-retry',
      action: 'DELETE',
    });
    await store.claimDecisionsDueForApply(new Date(), 1, 'lease-retry-1', new Date(Date.now() + 60_000));
    const retryable = await application.recordApplyFailure('decision-retry', 'content unavailable', 'lease-retry-1', false, new Date());
    expect(retryable).toMatchObject({ applyStatus: 'APPLY_FAILED_RETRYABLE', attempts: 1 });
    await store.claimDecisionsDueForApply(new Date(Date.now() + 1), 1, 'lease-retry-2', new Date(Date.now() + 60_000));
    const final = await application.recordApplyFailure('decision-retry', 'retry exhausted', 'lease-retry-2', true);
    expect(final).toMatchObject({ applyStatus: 'APPLY_FAILED_FINAL', attempts: 2 });
    await expect(application.recordApplyFailure('decision-retry', 'too late', 'stale-lease')).resolves.toBeNull();
  });

  it('uses requestId as the review submission idempotency key', async () => {
    const application = new GovernanceApplication(new TestGovernanceStore());
    const first = await application.submitReview({ requestId: 'review-one', targetType: 'VIDEO', targetId: '100' });
    const repeated = await application.submitReview({ requestId: 'review-one', targetType: 'VIDEO', targetId: '100' });
    expect(repeated.id).toBe(first.id);
    expect(repeated.decisionId).toBe(first.decisionId);
  });
});
