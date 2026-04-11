import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Express } from 'express';

import { resolveCategoryCode } from '../../common/constants/categories';
import { PrismaService } from '../prisma/prisma.service';
import { FollowService } from '../follow/follow.service';
import { MediaService } from './media.service';
import { MinioService } from '../storage/minio.service';

interface VideoListOptions {
  categoryCode?: string;
  sortBy?: 'hot' | 'latest';
  page?: number;
  pageSize?: number;
}

@Injectable()
export class VideoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly followService: FollowService,
    private readonly mediaService: MediaService,
    private readonly minioService: MinioService,
  ) {}

  async uploadFile(file: Express.Multer.File, assetType: 'ORIGINAL' | 'COVER' | 'RECORDING' = 'ORIGINAL') {
    const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, '/');
    const folder =
      assetType === 'COVER' ? 'videos/covers' : assetType === 'RECORDING' ? 'videos/recordings' : 'videos/original';
    const objectKey = `${folder}/${datePrefix}/${this.buildStorageFileName(file.originalname)}`;
    const uploaded = await this.minioService.uploadObject({
      objectKey,
      buffer: file.buffer,
      size: file.size,
      mimeType: file.mimetype,
      originalName: file.originalname,
    });

    const asset = await this.prisma.videoAsset.create({
      data: {
        assetType,
        objectKey: uploaded.objectKey,
        bucket: uploaded.bucket,
        mimeType: file.mimetype,
        originalName: file.originalname,
        fileSize: file.size,
        url: uploaded.url,
      },
    });

    return {
      assetId: asset.id,
      uploadToken: asset.objectKey,
      url: asset.url,
      objectKey: asset.objectKey,
      assetType,
    };
  }

  async createVideo(
    user: { id: number },
    payload: {
      assetId?: number;
      uploadToken?: string;
      title: string;
      description?: string;
      category: string;
      coverUrl?: string;
      coverAssetId?: number;
      coverUploadToken?: string;
    },
  ) {
    const asset = await this.resolveAsset(payload.assetId, payload.uploadToken, 'Uploaded asset not found');
    if (!asset) {
      throw new NotFoundException('Uploaded asset not found');
    }

    let coverUrl =
      payload.coverUrl ??
      'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80';
    const coverAsset = await this.resolveAsset(
      payload.coverAssetId,
      payload.coverUploadToken,
      'Cover asset not found',
    );

    if (coverAsset) {
      coverUrl = coverAsset.url;
    }

    const video = await this.prisma.video.create({
      data: {
        creatorId: user.id,
        title: payload.title,
        description: payload.description ?? '',
        category: payload.category,
        coverUrl,
        playUrl: asset.url,
        status: 'DRAFT',
        uploadToken: asset.objectKey,
      },
    });

    await this.prisma.videoAsset.update({
      where: { id: asset.id },
      data: { videoId: video.id },
    });

    if (coverAsset) {
      await this.prisma.videoAsset.update({
        where: { id: coverAsset.id },
        data: { videoId: video.id },
      });
    }

    await this.mediaService.processVideo(video.id, asset.id, coverAsset?.id ?? null);

    return this.prisma.video.findUnique({ where: { id: video.id } });
  }

  async updateDraft(
    videoId: number,
    user: { id: number; role: 'USER' | 'ADMIN' },
    payload: { title?: string; description?: string; category?: string; coverUrl?: string },
  ) {
    const video = await this.prisma.video.findUnique({ where: { id: videoId } });

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    if (video.creatorId !== user.id && user.role !== 'ADMIN') {
      throw new ForbiddenException('Cannot update others videos');
    }

    if (!['DRAFT', 'REJECTED'].includes(video.status)) {
      throw new ForbiddenException('Only draft or rejected videos can be edited');
    }

    return this.prisma.video.update({
      where: { id: videoId },
      data: {
        ...(payload.title !== undefined ? { title: payload.title } : {}),
        ...(payload.description !== undefined ? { description: payload.description } : {}),
        ...(payload.category !== undefined ? { category: payload.category } : {}),
        ...(payload.coverUrl !== undefined ? { coverUrl: payload.coverUrl } : {}),
        submittedAt: null,
      },
    });
  }

  async getReviewHistory(videoId: number, user: { id: number; role: 'USER' | 'ADMIN' }) {
    const video = await this.prisma.video.findUnique({ where: { id: videoId } });

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    if (video.creatorId !== user.id && user.role !== 'ADMIN') {
      throw new ForbiddenException('Cannot view others videos');
    }

    return this.prisma.videoReview.findMany({
      where: { videoId },
      include: {
        reviewer: {
          select: {
            id: true,
            nickname: true,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
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
        OR: [{ creatorId: current.creatorId }, { category: current.category }],
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
          notIn: [id, ...related.map((item: (typeof related)[number]) => item.id)],
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
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    });
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

  async getRecommendFeed(options: VideoListOptions = {}) {
    const page = this.normalizePage(options.page);
    const pageSize = this.normalizePageSize(options.pageSize);
    const category = resolveCategoryCode(options.categoryCode);

    return this.prisma.video.findMany({
      where: {
        status: 'PUBLISHED',
        ...(category ? { category } : {}),
      },
      include: {
        creator: {
          select: {
            id: true,
            nickname: true,
          },
        },
      },
      orderBy: this.buildVideoOrderBy(options.sortBy),
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
  }

  async searchPublishedVideos(keyword: string, options: VideoListOptions = {}) {
    const page = this.normalizePage(options.page);
    const pageSize = this.normalizePageSize(options.pageSize);
    const category = resolveCategoryCode(options.categoryCode);

    return this.prisma.video.findMany({
      where: {
        status: 'PUBLISHED',
        ...(category ? { category } : {}),
        ...(keyword
          ? {
              OR: [
                {
                  title: {
                    contains: keyword,
                  },
                },
                {
                  description: {
                    contains: keyword,
                  },
                },
              ],
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
      orderBy: this.buildVideoOrderBy(options.sortBy),
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
  }

  async likeVideo(videoId: number, user: { id: number; nickname: string }) {
    const video = await this.requirePublishedVideo(videoId);
    const existing = await this.prisma.videoLike.findUnique({
      where: { videoId_userId: { videoId, userId: user.id } },
    });

    if (!existing) {
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
    }

    return { liked: true };
  }

  async unlikeVideo(videoId: number, user: { id: number }) {
    await this.requirePublishedVideo(videoId);
    const existing = await this.prisma.videoLike.findUnique({
      where: { videoId_userId: { videoId, userId: user.id } },
    });

    if (!existing) {
      return { liked: false };
    }

    await this.prisma.videoLike.delete({ where: { id: existing.id } });
    await this.prisma.video.update({
      where: { id: videoId },
      data: { likeCount: { decrement: 1 } },
    });

    return { liked: false };
  }

  async favoriteVideo(videoId: number, user: { id: number; nickname: string }) {
    const video = await this.requirePublishedVideo(videoId);
    const existing = await this.prisma.favorite.findUnique({
      where: { videoId_userId: { videoId, userId: user.id } },
    });

    if (!existing) {
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
    }

    return { favorited: true };
  }

  async unfavoriteVideo(videoId: number, user: { id: number }) {
    await this.requirePublishedVideo(videoId);
    const existing = await this.prisma.favorite.findUnique({
      where: { videoId_userId: { videoId, userId: user.id } },
    });

    if (!existing) {
      return { favorited: false };
    }

    await this.prisma.favorite.delete({ where: { id: existing.id } });
    await this.prisma.video.update({
      where: { id: videoId },
      data: { favoriteCount: { decrement: 1 } },
    });

    return { favorited: false };
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
    await this.requirePublishedVideo(videoId);

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

  private async requirePublishedVideo(videoId: number) {
    const video = await this.prisma.video.findUnique({ where: { id: videoId } });

    if (!video || video.status !== 'PUBLISHED') {
      throw new NotFoundException('Video not found');
    }

    return video;
  }

  private async resolveAsset(assetId?: number, uploadToken?: string, errorMessage = 'Uploaded asset not found') {
    if (assetId !== undefined) {
      const asset = await this.prisma.videoAsset.findUnique({ where: { id: assetId } });
      if (!asset) {
        throw new NotFoundException(errorMessage);
      }
      return asset;
    }

    if (uploadToken) {
      const asset = await this.prisma.videoAsset.findUnique({ where: { objectKey: uploadToken } });
      if (!asset) {
        throw new NotFoundException(errorMessage);
      }
      return asset;
    }

    if (errorMessage !== 'Uploaded asset not found') {
      return null;
    }

    throw new NotFoundException(errorMessage);
  }

  private buildVideoOrderBy(sortBy?: 'hot' | 'latest') {
    if (sortBy === 'hot') {
      return [
        { likeCount: 'desc' as const },
        { favoriteCount: 'desc' as const },
        { commentCount: 'desc' as const },
        { publishedAt: 'desc' as const },
        { id: 'desc' as const },
      ];
    }

    return [{ publishedAt: 'desc' as const }, { id: 'desc' as const }];
  }

  private normalizePage(page?: number) {
    if (!page || !Number.isFinite(page) || page < 1) {
      return 1;
    }

    return Math.floor(page);
  }

  private normalizePageSize(pageSize?: number) {
    if (!pageSize || !Number.isFinite(pageSize) || pageSize < 1) {
      return 20;
    }

    return Math.min(50, Math.floor(pageSize));
  }

  private buildStorageFileName(originalName: string) {
    const extensionMatch = originalName.match(/(\.[A-Za-z0-9]+)$/);
    const extension = extensionMatch?.[1]?.toLowerCase() ?? '';
    const baseName = extension ? originalName.slice(0, -extension.length) : originalName;
    const normalizedBase = baseName
      .normalize('NFKD')
      .replace(/[^\x00-\x7F]/g, '')
      .replace(/[^A-Za-z0-9_-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase();
    const safeBase = normalizedBase || 'upload';

    return `${Date.now()}-${safeBase}${extension}`;
  }
}
