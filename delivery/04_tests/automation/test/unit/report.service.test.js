const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const { BadRequestException, NotFoundException } = require('@nestjs/common');

const { ReportService } = require('../../backend/dist/modules/report/report.service.js');

function createMockFn(impl = async () => undefined) {
  const fn = async (...args) => {
    fn.calls.push(args);
    return impl(...args);
  };
  fn.calls = [];
  fn.setImpl = (nextImpl) => {
    impl = nextImpl;
  };
  return fn;
}

function makePrisma() {
  return {
    video: { findUnique: createMockFn(async () => null) },
    comment: { findUnique: createMockFn(async () => null) },
    videoDanmaku: { findUnique: createMockFn(async () => null) },
    reportRecord: {
      findUnique: createMockFn(async () => null),
      create: createMockFn(async ({ data }) => ({ id: 1, ...data })),
    },
  };
}

describe('ReportService', () => {
  it('rejects blank report reason', async () => {
    const service = new ReportService(makePrisma());

    await assert.rejects(
      service.createReport({ id: 1 }, { targetType: 'VIDEO', targetId: 10, reason: '   ' }),
      (error) => error instanceof BadRequestException,
    );
  });

  it('creates a video report after confirming target exists', async () => {
    const prisma = makePrisma();
    prisma.video.findUnique.setImpl(async () => ({ id: 10 }));
    const service = new ReportService(prisma);

    const result = await service.createReport({ id: 1 }, { targetType: 'VIDEO', targetId: 10, reason: ' spam ' });

    assert.deepEqual(prisma.reportRecord.create.calls[0][0].data, {
      reporterId: 1,
      targetType: 'VIDEO',
      reason: 'spam',
      status: 'PENDING',
      pendingKey: '1:VIDEO:10',
      videoId: 10,
    });
    assert.equal(result.status, 'PENDING');
  });

  it('creates a comment report after confirming target exists', async () => {
    const prisma = makePrisma();
    prisma.comment.findUnique.setImpl(async () => ({ id: 20 }));
    const service = new ReportService(prisma);

    await service.createReport({ id: 1 }, { targetType: 'COMMENT', targetId: 20, reason: 'bad comment' });

    assert.equal(prisma.reportRecord.create.calls[0][0].data.commentId, 20);
  });

  it('creates a danmaku report after confirming target exists', async () => {
    const prisma = makePrisma();
    prisma.videoDanmaku.findUnique.setImpl(async () => ({ id: 30 }));
    const service = new ReportService(prisma);

    await service.createReport({ id: 1 }, { targetType: 'VIDEO_DANMAKU', targetId: 30, reason: 'bad danmaku' });

    assert.equal(prisma.reportRecord.create.calls[0][0].data.danmakuId, 30);
  });

  it('returns the existing pending report for a sequential duplicate', async () => {
    const prisma = makePrisma();
    const existing = {
      id: 41,
      reporterId: 1,
      targetType: 'VIDEO',
      videoId: 10,
      reason: 'first reason',
      status: 'PENDING',
      pendingKey: '1:VIDEO:10',
    };
    prisma.reportRecord.findUnique.setImpl(async () => existing);
    const service = new ReportService(prisma);

    const result = await service.createReport(
      { id: 1 },
      { targetType: 'VIDEO', targetId: 10, reason: 'second reason' },
    );

    assert.equal(result, existing);
    assert.equal(prisma.reportRecord.create.calls.length, 0);
    assert.equal(prisma.video.findUnique.calls.length, 0);
  });

  it('returns the winning pending report after a concurrent unique conflict', async () => {
    const prisma = makePrisma();
    const winner = {
      id: 42,
      reporterId: 1,
      targetType: 'COMMENT',
      commentId: 20,
      reason: 'duplicate comment',
      status: 'PENDING',
      pendingKey: '1:COMMENT:20',
    };
    prisma.comment.findUnique.setImpl(async () => ({ id: 20 }));
    prisma.reportRecord.findUnique.setImpl(async () =>
      prisma.reportRecord.findUnique.calls.length >= 3 ? winner : null,
    );
    prisma.reportRecord.create.setImpl(async () => {
      if (prisma.reportRecord.create.calls.length === 1) return winner;
      throw Object.assign(new Error('unique conflict'), { code: 'P2002' });
    });
    const service = new ReportService(prisma);
    const payload = { targetType: 'COMMENT', targetId: 20, reason: 'duplicate comment' };

    const results = await Promise.all([
      service.createReport({ id: 1 }, payload),
      service.createReport({ id: 1 }, payload),
    ]);

    assert.deepEqual(results, [winner, winner]);
    assert.equal(prisma.reportRecord.create.calls.length, 2);
  });

  it('throws NotFoundException when reported target is missing', async () => {
    const service = new ReportService(makePrisma());

    await assert.rejects(
      service.createReport({ id: 1 }, { targetType: 'VIDEO', targetId: 999, reason: 'missing' }),
      (error) => error instanceof NotFoundException,
    );
  });
});
