import { AdminController } from './admin.controller';

describe('AdminController', () => {
  function createController(prismaOverrides: Record<string, unknown>) {
    const authService = {
      requireUser: jest.fn().mockResolvedValue({ id: 1, role: 'ADMIN', nickname: 'admin' }),
    };
    const prisma = {
      videoReview: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      video: {
        update: jest.fn(),
      },
      $transaction: jest.fn((operations: unknown[]) => Promise.all(operations)),
      ...prismaOverrides,
    };

    return {
      controller: new AdminController(authService as never, prisma as never),
      authService,
      prisma,
    };
  }

  it('returns only the latest review per video in the admin review list', async () => {
    const approvedHistory = {
      id: 11,
      videoId: 7,
      status: 'APPROVED',
      video: { id: 7, status: 'PUBLISHED' },
    };
    const currentPending = {
      id: 12,
      videoId: 7,
      status: 'PENDING',
      video: { id: 7, status: 'PENDING_REVIEW' },
    };
    const duplicateOlderPending = {
      id: 10,
      videoId: 7,
      status: 'PENDING',
      video: { id: 7, status: 'PENDING_REVIEW' },
    };
    const otherPending = {
      id: 13,
      videoId: 8,
      status: 'PENDING',
      video: { id: 8, status: 'PENDING_REVIEW' },
    };

    const { controller, prisma } = createController({});
    prisma.videoReview.findMany.mockResolvedValue([currentPending, approvedHistory, duplicateOlderPending, otherPending]);

    const response = await controller.getVideoReviewQueue('Bearer admin-token');

    expect(prisma.videoReview.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
    );
    expect(response.data).toEqual([currentPending, otherPending]);
    expect(response.data).not.toContain(approvedHistory);
  });

  it('allows rejecting an approved review record to take down a published video', async () => {
    const { controller, prisma } = createController({});
    prisma.videoReview.findUnique.mockResolvedValue({
      id: 11,
      videoId: 7,
      status: 'APPROVED',
      video: { id: 7, status: 'PUBLISHED' },
    });
    prisma.videoReview.update.mockResolvedValue({
      id: 11,
      videoId: 7,
      status: 'REJECTED',
      reason: '内容需要下架',
    });
    prisma.video.update.mockResolvedValue({
      id: 7,
      status: 'REJECTED',
    });

    const response = await controller.reviewVideo('Bearer admin-token', 11, {
      action: 'REJECT',
      reason: '内容需要下架',
    });

    expect(prisma.video.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 7 },
        data: expect.objectContaining({
          status: 'REJECTED',
          rejectReason: '内容需要下架',
        }),
      }),
    );
    expect(response.data).toEqual(
      expect.objectContaining({
        id: 11,
        videoId: 7,
        videoStatus: 'REJECTED',
        reason: '内容需要下架',
      }),
    );
  });

  it('handles a pending report once and notifies the reporter', async () => {
    const tx = {
      comment: {
        update: jest.fn().mockResolvedValue({ id: 44, status: 'DELETED' }),
      },
      videoDanmaku: {
        update: jest.fn(),
      },
      video: {
        update: jest.fn(),
      },
      reportRecord: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id: 21,
          reporterId: 2,
          status: 'PROCESSED',
          handlerId: 1,
          handleNote: '违规内容',
        }),
      },
      notification: {
        create: jest.fn().mockResolvedValue({ id: 99 }),
      },
    };
    const { controller, prisma } = createController({
      reportRecord: {
        findUnique: jest.fn().mockResolvedValue({
          id: 21,
          reporterId: 2,
          targetType: 'COMMENT',
          commentId: 44,
          status: 'PENDING',
        }),
      },
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx)),
    });

    const response = await controller.handleReport('Bearer admin-token', 21, {
      action: 'DELETE',
      reason: '违规内容',
    });

    expect(tx.comment.update).toHaveBeenCalledWith({
      where: { id: 44 },
      data: { status: 'DELETED' },
    });
    expect(tx.reportRecord.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 21, status: 'PENDING' },
        data: expect.objectContaining({
          status: 'PROCESSED',
          handlerId: 1,
          handleNote: '违规内容',
        }),
      }),
    );
    expect(tx.reportRecord.findUniqueOrThrow).toHaveBeenCalledWith({ where: { id: 21 } });
    expect(tx.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        recipientId: 2,
        actorId: 1,
        type: 'REPORT',
        title: '举报处理完成',
        relatedType: 'REPORT',
        relatedId: 21,
      }),
    });
    expect(response.data).toEqual(expect.objectContaining({ id: 21, status: 'PROCESSED' }));
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('rejects repeated handling for an already processed report', async () => {
    const { controller, prisma } = createController({
      reportRecord: {
        findUnique: jest.fn().mockResolvedValue({
          id: 21,
          reporterId: 2,
          targetType: 'COMMENT',
          commentId: 44,
          status: 'PROCESSED',
        }),
      },
      $transaction: jest.fn(),
    });

    await expect(
      controller.handleReport('Bearer admin-token', 21, {
        action: 'DELETE',
        reason: '重复处理',
      }),
    ).rejects.toThrow('Report already handled');

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('allows deleting a handled report record without reverting the moderation result', async () => {
    const reportRecord = {
      findUnique: jest.fn().mockResolvedValue({
        id: 21,
        status: 'PROCESSED',
      }),
      delete: jest.fn().mockResolvedValue({ id: 21 }),
    };
    const { controller } = createController({
      reportRecord: {
        findUnique: reportRecord.findUnique,
        delete: reportRecord.delete,
      },
    });

    const response = await controller.deleteReportRecord('Bearer admin-token', 21);

    expect(reportRecord.delete).toHaveBeenCalledWith({ where: { id: 21 } });
    expect(response.data).toEqual({ deleted: true, reportId: 21 });
  });
});
