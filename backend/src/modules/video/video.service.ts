import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { FollowService } from '../follow/follow.service';

@Injectable()
export class VideoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly followService: FollowService,
  ) {}

  async createVideo(
    user: { id: number },
    payload: { uploadToken: string; title: string; description?: string; categoryId: number; coverUrl?: string },
  ) {
    return this.prisma.video.create({
      data: {
        creatorId: user.id,
        title: payload.title,
        description: payload.description ?? '',
        categoryId: payload.categoryId,
        coverUrl:
          payload.coverUrl ??
          'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80',
        playUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
        status: 'DRAFT',
        uploadToken: payload.uploadToken,
      },
    });
  }

  async getVideoDetail(id: number, currentUserId?: number) {
    const video = await this.prisma.video.findFirst({
      where: { id, status: 'PUBLISHED' },
      include: { creator: true },
    });

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    const isFollowingCreator = await this.followService.isFollowing(video.creator.id, currentUserId);
    const followerCount = await this.followService.getFollowerCount(video.creator.id);
    const isLiked = currentUserId
      ? Boolean(
          await this.prisma.videoLike.findUnique({
            where: { videoId_userId: { videoId: id, userId: currentUserId } },
          }),
        )
      : false;
    const isFavorited = currentUserId
      ? Boolean(
          await this.prisma.favorite.findUnique({
            where: { videoId_userId: { videoId: id, userId: currentUserId } },
          }),
        )
      : false;

    return {
      ...video,
      creator: {
        id: video.creator.id,
        nickname: video.creator.nickname,
        role: video.creator.role,
        followerCount,
      },
      isFollowingCreator,
      isLiked,
      isFavorited,
    };
  }

  async getRelatedVideos(id: number) {
    const current = await this.prisma.video.findUnique({ where: { id } });

    if (!current) {
      throw new NotFoundException('Video not found');
    }

    const related = await this.prisma.video.findMany({
      where: {
        status: 'PUBLISHED',
        id: { not: id },
        OR: [{ creatorId: current.creatorId }, { categoryId: current.categoryId }],
      },
      include: {
        creator: {
          select: {
            id: true,
            nickname: true,
          },
        },
      },
      orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
      take: 6,
    });

    if (related.length >= 6) {
      return related;
    }

    const fallback = await this.prisma.video.findMany({
      where: {
        status: 'PUBLISHED',
        id: {
          notIn: [id, ...related.map((item) => item.id)],
        },
      },
      include: {
        creator: {
          select: {
            id: true,
            nickname: true,
          },
        },
      },
      orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
      take: 6 - related.length,
    });

    return [...related, ...fallback];
  }

  async submitReview(id: number, user: { id: number; role: 'USER' | 'ADMIN' }) {
    const video = await this.prisma.video.findUnique({ where: { id } });

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    if (video.creatorId !== user.id && user.role !== 'ADMIN') {
      throw new ForbiddenException('Cannot submit others videos');
    }

    await this.prisma.video.update({
      where: { id },
      data: {
        status: 'PENDING_REVIEW',
        submittedAt: new Date(),
        rejectReason: null,
      },
    });

    const review = await this.prisma.videoReview.create({
      data: {
        videoId: id,
        status: 'PENDING',
      },
    });

    return {
      videoId: id,
      reviewId: review.id,
      status: 'PENDING_REVIEW',
    };
  }

  async getCreatorVideos(user: { id: number }) {
    return this.prisma.video.findMany({
      where: { creatorId: user.id },
      orderBy: { id: 'desc' },
    });
  }

  upload() {
    return {
      uploadToken: `mock-upload-${Date.now()}`,
      url: 'https://example.com/source.mp4',
    };
  }

  async countVideosByStatus(creatorId: number) {
    const grouped = await this.prisma.video.groupBy({
      by: ['status'],
      where: { creatorId },
      _count: { _all: true },
    });

    const index = new Map<string, number>(
      grouped.map((item: { status: string; _count: { _all: number } }) => [item.status, item._count._all]),
    );

    return {
      totalVideos: grouped.reduce(
        (sum: number, item: { _count: { _all: number } }) => sum + item._count._all,
        0,
      ),
      pendingReviews: index.get('PENDING_REVIEW') ?? 0,
      publishedVideos: index.get('PUBLISHED') ?? 0,
      rejectedVideos: index.get('REJECTED') ?? 0,
    };
  }

  async getRecommendFeed() {
    return this.prisma.video.findMany({
      where: { status: 'PUBLISHED' },
      include: {
        creator: {
          select: {
            id: true,
            nickname: true,
          },
        },
      },
      orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
      take: 20,
    });
  }

  async searchPublishedVideos(keyword: string) {
    return this.prisma.video.findMany({
      where: {
        status: 'PUBLISHED',
        ...(keyword
          ? {
              title: {
                contains: keyword,
              },
            }
          : {}),
      },
      include: {
        creator: {
          select: {
            id: true,
            nickname: true,
          },
        },
      },
      orderBy: { id: 'desc' },
    });
  }

  async toggleLike(videoId: number, user: { id: number; nickname: string }) {
    const video = await this.prisma.video.findUnique({ where: { id: videoId } });

    if (!video || video.status !== 'PUBLISHED') {
      throw new NotFoundException('Video not found');
    }

    const existing = await this.prisma.videoLike.findUnique({
      where: { videoId_userId: { videoId, userId: user.id } },
    });

    if (existing) {
      await this.prisma.videoLike.delete({ where: { id: existing.id } });
      await this.prisma.video.update({
        where: { id: videoId },
        data: { likeCount: { decrement: 1 } },
      });
      return { liked: false };
    }

    await this.prisma.videoLike.create({
      data: { videoId, userId: user.id },
    });
    await this.prisma.video.update({
      where: { id: videoId },
      data: { likeCount: { increment: 1 } },
    });

    if (video.creatorId !== user.id) {
      await this.prisma.notification.create({
        data: {
          recipientId: video.creatorId,
          actorId: user.id,
          type: 'LIKE',
          title: '收到新的点赞',
          content: `${user.nickname} 点赞了你的视频`,
          relatedType: 'VIDEO',
          relatedId: videoId,
        },
      });
    }

    return { liked: true };
  }

  async toggleFavorite(videoId: number, user: { id: number; nickname: string }) {
    const video = await this.prisma.video.findUnique({ where: { id: videoId } });

    if (!video || video.status !== 'PUBLISHED') {
      throw new NotFoundException('Video not found');
    }

    const existing = await this.prisma.favorite.findUnique({
      where: { videoId_userId: { videoId, userId: user.id } },
    });

    if (existing) {
      await this.prisma.favorite.delete({ where: { id: existing.id } });
      await this.prisma.video.update({
        where: { id: videoId },
        data: { favoriteCount: { decrement: 1 } },
      });
      return { favorited: false };
    }

    await this.prisma.favorite.create({
      data: { videoId, userId: user.id },
    });
    await this.prisma.video.update({
      where: { id: videoId },
      data: { favoriteCount: { increment: 1 } },
    });

    if (video.creatorId !== user.id) {
      await this.prisma.notification.create({
        data: {
          recipientId: video.creatorId,
          actorId: user.id,
          type: 'FAVORITE',
          title: '收到新的收藏',
          content: `${user.nickname} 收藏了你的视频`,
          relatedType: 'VIDEO',
          relatedId: videoId,
        },
      });
    }

    return { favorited: true };
  }

  async listDanmakus(videoId: number, fromMs?: number, toMs?: number) {
    return this.prisma.videoDanmaku.findMany({
      where: {
        videoId,
        status: 'NORMAL',
        ...(fromMs !== undefined || toMs !== undefined
          ? {
              timeOffsetMs: {
                ...(fromMs !== undefined ? { gte: fromMs } : {}),
                ...(toMs !== undefined ? { lte: toMs } : {}),
              },
            }
          : {}),
      },
      include: {
        user: {
          select: { id: true, nickname: true },
        },
      },
      orderBy: [{ timeOffsetMs: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async createDanmaku(
    videoId: number,
    user: { id: number },
    payload: { content: string; timeOffsetMs: number; color?: string },
  ) {
    const video = await this.prisma.video.findUnique({ where: { id: videoId } });

    if (!video || video.status !== 'PUBLISHED') {
      throw new NotFoundException('Video not found');
    }

    return this.prisma.videoDanmaku.create({
      data: {
        videoId,
        userId: user.id,
        content: payload.content,
        color: payload.color ?? '#FFFFFF',
        timeOffsetMs: payload.timeOffsetMs,
        status: 'NORMAL',
      },
      include: {
        user: {
          select: { id: true, nickname: true },
        },
      },
    });
  }
}
