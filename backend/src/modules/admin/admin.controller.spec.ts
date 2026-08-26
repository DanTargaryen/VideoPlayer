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
});
