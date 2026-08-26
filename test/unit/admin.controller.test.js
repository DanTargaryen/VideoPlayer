const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const { NotFoundException, UnauthorizedException } = require('@nestjs/common');

const { AdminController } = require('../../backend/dist/modules/admin/admin.controller.js');

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

function makeController(role = 'ADMIN') {
  const authService = {
    requireUser: createMockFn(async () => ({ id: 1, role, nickname: 'Admin' })),
  };
  const prisma = {
    videoReview: {
      findUnique: createMockFn(async () => ({ id: 10, videoId: 20 })),
      update: createMockFn(async ({ where, data }) => ({ id: where.id, ...data })),
      findMany: createMockFn(async () => []),
      count: createMockFn(async () => 1),
    },
    video: {
      update: createMockFn(async ({ where, data }) => ({ id: where.id, ...data })),
      count: createMockFn(async () => 1),
    },
    comment: {
      update: createMockFn(async ({ where, data }) => ({ id: where.id, ...data })),
      findMany: createMockFn(async () => []),
      count: createMockFn(async () => 1),
    },
    videoDanmaku: {
      update: createMockFn(async ({ where, data }) => ({ id: where.id, ...data })),
      findMany: createMockFn(async () => []),
      count: createMockFn(async () => 1),
    },
    reportRecord: {
      findUnique: createMockFn(async () => ({
        id: 30,
        targetType: 'VIDEO',
        videoId: 20,
        reporterId: 2,
        status: 'PENDING',
      })),
      update: createMockFn(async ({ where, data }) => ({ id: where.id, ...data })),
      updateMany: createMockFn(async () => ({ count: 1 })),
      findUniqueOrThrow: createMockFn(async ({ where }) => ({ id: where.id, status: 'PROCESSED' })),
      findMany: createMockFn(async () => []),
      count: createMockFn(async () => 1),
    },
    notification: {
      create: createMockFn(async ({ data }) => ({ id: 40, ...data })),
    },
  };
  prisma.$transaction = createMockFn(async (input) => {
    if (Array.isArray(input)) {
      return Promise.all(input);
    }
    return input(prisma);
  });
  return { controller: new AdminController(authService, prisma), authService, prisma };
}

describe('AdminController authorization and review', () => {
  it('rejects non-admin users', async () => {
    const { controller } = makeController('USER');

    await assert.rejects(controller.getDashboard('Bearer token'), (error) => error instanceof UnauthorizedException);
  });

  it('approves video review and publishes the video', async () => {
    const { controller, prisma } = makeController();

    const result = await controller.reviewVideo('Bearer token', 10, { action: 'APPROVE' });

    assert.equal(result.code, 0);
    assert.equal(result.data.status, 'APPROVED');
    assert.equal(result.data.videoStatus, 'PUBLISHED');
    assert.equal(prisma.video.update.calls[0][0].data.rejectReason, null);
  });

  it('rejects video review with fallback reason', async () => {
    const { controller, prisma } = makeController();

    const result = await controller.reviewVideo('Bearer token', 10, { action: 'REJECT' });

    assert.equal(result.data.status, 'REJECTED');
    assert.equal(prisma.video.update.calls[0][0].data.status, 'REJECTED');
    assert.equal(typeof prisma.video.update.calls[0][0].data.rejectReason, 'string');
  });
});

describe('AdminController governance handling', () => {
  it('moderates comments and returns operator nickname', async () => {
    const { controller, prisma } = makeController();

    const result = await controller.moderateTextContent('Bearer token', 'COMMENT', 11, { action: 'HIDE' });

    assert.equal(result.data.status, 'HIDDEN');
    assert.deepEqual(prisma.comment.update.calls[0][0], { where: { id: 11 }, data: { status: 'HIDDEN' } });
    assert.equal(result.data.operator, 'Admin');
  });

  it('handles video reports by rejecting target video and marking report processed', async () => {
    const { controller, prisma } = makeController();

    const result = await controller.handleReport('Bearer token', 30, { action: 'DELETE', reason: 'illegal' });

    assert.equal(result.data.status, 'PROCESSED');
    assert.deepEqual(prisma.video.update.calls[0][0], {
      where: { id: 20 },
      data: { status: 'REJECTED', rejectReason: 'illegal' },
    });
    assert.equal(prisma.reportRecord.updateMany.calls[0][0].data.handlerId, 1);
    assert.equal(prisma.notification.create.calls[0][0].data.recipientId, 2);
  });

  it('throws when a review or report record is missing', async () => {
    const { controller, prisma } = makeController();
    prisma.videoReview.findUnique.setImpl(async () => null);
    prisma.reportRecord.findUnique.setImpl(async () => null);

    await assert.rejects(controller.reviewVideo('Bearer token', 404, { action: 'APPROVE' }), (error) => error instanceof UnauthorizedException);
    await assert.rejects(controller.handleReport('Bearer token', 404, { action: 'KEEP' }), (error) => error instanceof NotFoundException);
  });
});
