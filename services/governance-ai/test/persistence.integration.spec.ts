import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { GovernanceApplication } from '../src/application.js';
import { PrismaGovernanceStore } from '../src/prisma-store.js';

const databaseUrl = process.env.GOVERNANCE_DATABASE_URL ?? '';
if (!/\/video_player_governance[^/?]*test(?:[?]|$)/.test(databaseUrl)) {
  throw new Error('GOVERNANCE_DATABASE_URL must target an isolated governance test database');
}

let store = new PrismaGovernanceStore();
let app = new GovernanceApplication(store);

beforeAll(async () => {
  const prisma = (store as unknown as { prisma: {
    moderationDecision: { deleteMany(): Promise<unknown> };
    reportRecord: { deleteMany(): Promise<unknown> };
    videoReview: { deleteMany(): Promise<unknown> };
  } }).prisma;
  await prisma.moderationDecision.deleteMany();
  await prisma.reportRecord.deleteMany();
  await prisma.videoReview.deleteMany();
});

afterAll(async () => {
  await store.close();
});

describe('governance isolated MySQL persistence', () => {
  it('collapses concurrent pending reports and persists string external IDs across restart', async () => {
    const reports = await Promise.all(Array.from({ length: 12 }, (_, index) => app.createReport({
      reporterId: 7,
      requestId: `mysql-report-${index}`,
      targetType: 'COMMENT',
      targetId: 'comment-cuid-001',
      videoId: 'video-cuid-001',
      reason: 'isolated persistence check',
    })));
    expect(new Set(reports.map((report) => report.id)).size).toBe(1);
    expect(reports[0]).toMatchObject({ targetId: 'comment-cuid-001', videoId: 'video-cuid-001' });

    const handled = await app.handleReport({
      reportId: reports[0]!.id,
      handlerId: 2,
      requestId: 'mysql-handle-1',
      decisionId: 'mysql-decision-1',
      action: 'DELETE',
    });
    expect(handled.report.pendingKey).toBeNull();
    expect(handled.decision.applyStatus).toBe('APPLY_PENDING');

    await store.close();
    store = new PrismaGovernanceStore();
    app = new GovernanceApplication(store);
    const persisted = await app.latestReview('COMMENT', 'comment-cuid-001');
    expect(persisted).toMatchObject({
      decisionId: 'mysql-decision-1',
      targetId: 'comment-cuid-001',
      videoId: 'video-cuid-001',
      applyStatus: 'APPLY_PENDING',
    });

    const next = await app.createReport({
      reporterId: 7,
      requestId: 'mysql-report-after-handle',
      targetType: 'COMMENT',
      targetId: 'comment-cuid-001',
      videoId: 'video-cuid-001',
      reason: 'new report after pending key release',
    });
    expect(next.id).not.toBe(reports[0]!.id);
  });

  it('allows only one database worker to claim the same due decision', async () => {
    const report = await app.createReport({
      reporterId: 8,
      requestId: 'mysql-lease-report',
      targetType: 'VIDEO',
      targetId: 'lease-video-1',
      reason: 'lease concurrency check',
    });
    await app.handleReport({
      reportId: report.id,
      handlerId: 2,
      requestId: 'mysql-lease-handle',
      decisionId: 'mysql-lease-decision',
      action: 'DELETE',
    });
    const secondStore = new PrismaGovernanceStore();
    const now = new Date();
    try {
      const [firstClaims, secondClaims] = await Promise.all([
        store.claimDecisionsDueForApply(now, 20, 'mysql-worker-a', new Date(now.getTime() + 60_000)),
        secondStore.claimDecisionsDueForApply(now, 20, 'mysql-worker-b', new Date(now.getTime() + 60_000)),
      ]);
      const owners = [
        ...firstClaims.filter((decision) => decision.decisionId === 'mysql-lease-decision').map(() => 'mysql-worker-a'),
        ...secondClaims.filter((decision) => decision.decisionId === 'mysql-lease-decision').map(() => 'mysql-worker-b'),
      ];
      expect(owners).toHaveLength(1);
      expect(await store.markDecisionApplied('mysql-lease-decision', owners[0]!)).toMatchObject({ applyStatus: 'APPLIED', attempts: 1 });
    } finally {
      await secondStore.close();
    }
  });
});
