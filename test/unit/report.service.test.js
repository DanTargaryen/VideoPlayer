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

    await service.createReport({ id: 1 }, { targetType: 'DANMAKU', targetId: 30, reason: 'bad danmaku' });

    assert.equal(prisma.reportRecord.create.calls[0][0].data.danmakuId, 30);
  });

  it('throws NotFoundException when reported target is missing', async () => {
    const service = new ReportService(makePrisma());

    await assert.rejects(
      service.createReport({ id: 1 }, { targetType: 'VIDEO', targetId: 999, reason: 'missing' }),
      (error) => error instanceof NotFoundException,
    );
  });
});
