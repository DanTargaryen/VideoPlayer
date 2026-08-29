import { describe, expect, it } from 'vitest';

import { ModerationCompensator } from '../src/compensation.js';
import { ContentApplyError } from '../src/content-client.js';
import { GovernanceApplication } from '../src/application.js';
import { TestGovernanceStore } from './test-store.js';

async function pendingDecision(store: TestGovernanceStore, suffix: string) {
  const app = new GovernanceApplication(store);
  const report = await app.createReport({
    reporterId: 7,
    requestId: `report-${suffix}`,
    targetType: 'VIDEO',
    targetId: '1',
    reason: 'policy violation',
  });
  return (await app.handleReport({
    reportId: report.id,
    handlerId: 2,
    requestId: `handle-${suffix}`,
    decisionId: `decision-${suffix}`,
    action: 'DELETE',
  })).decision;
}

describe('governance moderation compensation', () => {
  it('marks a successfully applied decision and audits the attempt', async () => {
    const store = new TestGovernanceStore();
    await pendingDecision(store, 'success');
    const compensator = new ModerationCompensator(store, { async apply() {} });

    expect(await compensator.runOnce()).toEqual([
      { decisionId: 'decision-success', status: 'APPLIED' },
    ]);
    expect(await store.claimDecisionsDueForApply(new Date(), 10, 'after-success', new Date(Date.now() + 60_000))).toEqual([]);
  });

  it('keeps retryable failures auditable and applies them after recovery', async () => {
    const store = new TestGovernanceStore();
    await pendingDecision(store, 'retry');
    let available = false;
    const compensator = new ModerationCompensator(
      store,
      {
        async apply() {
          if (!available) throw new ContentApplyError('content-media returned 503', true, 503);
        },
      },
      { retryDelayMs: 1 },
    );
    const now = new Date('2026-08-29T00:00:00.000Z');

    expect(await compensator.runOnce(now)).toEqual([
      { decisionId: 'decision-retry', status: 'APPLY_FAILED_RETRYABLE' },
    ]);
    available = true;
    expect(await compensator.runOnce(new Date(now.getTime() + 2))).toEqual([
      { decisionId: 'decision-retry', status: 'APPLIED' },
    ]);
  });

  it('does not retry permanent content contract failures', async () => {
    const store = new TestGovernanceStore();
    await pendingDecision(store, 'final');
    const compensator = new ModerationCompensator(store, {
      async apply() {
        throw new ContentApplyError('content-media returned 409', false, 409);
      },
    });

    expect(await compensator.runOnce()).toEqual([
      { decisionId: 'decision-final', status: 'APPLY_FAILED_FINAL' },
    ]);
    expect(await compensator.runOnce()).toEqual([]);
  });

  it('atomically leases a decision so concurrent workers apply it once', async () => {
    const store = new TestGovernanceStore();
    await pendingDecision(store, 'concurrent');
    let applyCount = 0;
    const content = {
      async apply() {
        applyCount += 1;
        await new Promise((resolve) => setTimeout(resolve, 10));
      },
    };
    const first = new ModerationCompensator(store, content);
    const second = new ModerationCompensator(store, content);

    const results = await Promise.all([first.runOnce(), second.runOnce()]);

    expect(results.flat()).toEqual([{ decisionId: 'decision-concurrent', status: 'APPLIED' }]);
    expect(applyCount).toBe(1);
  });
});
