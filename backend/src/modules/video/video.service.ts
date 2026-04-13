import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Express } from 'express';

import { CATEGORY_DEFINITIONS, resolveCategoryId } from '../../common/constants/categories';
import { PrismaService } from '../prisma/prisma.service';
import { FollowService } from '../follow/follow.service';
import { UserProfileService, type UserRecommendationProfileDto } from '../user/user-profile.service';
import { MediaService } from './media.service';
import { MinioService } from '../storage/minio.service';
import { VIDEO_WATCH_EVENTS, VIDEO_WATCH_THRESHOLDS } from './video-watch.constants';

interface VideoListOptions {
  currentUserId?: number;
  categoryCode?: string;
  sortBy?: 'best' | 'hot' | 'latest';
  page?: number;
  pageSize?: number;
}

interface RecommendCandidate {
  id: number;
  creatorId: number;
  categoryId: number;
  likeCount: number;
  favoriteCount: number;
  commentCount: number;
  publishedAt: Date | null;
}

interface RecommendationContext {
  currentUserId: number;
  categoryPreferenceIndex: Map<number, number>;
  creatorPreferenceIndex: Map<number, number>;
  activityLevel: UserRecommendationProfileDto['summary']['activityLevel'];
  creatorViewerTendency: UserRecommendationProfileDto['summary']['creatorViewerTendency'];
  isColdStart: boolean;
}

const CATEGORY_SEARCH_META = new Map<number, { code: string; label: string }>(
  CATEGORY_DEFINITIONS.filter((item) => item.id !== null).map((item) => [
    item.id,
    {
      code: item.code.toLowerCase(),
      label: item.label.toLowerCase(),
    },
  ]),
);

@Injectable()
export class VideoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly followService: FollowService,
    private readonly userProfileService: UserProfileService,
    private readonly mediaService: MediaService,
    private readonly minioService: MinioService,
  ) {}

  async uploadFile(file: Express.Multer.File, assetType: 'ORIGINAL' | 'COVER' = 'ORIGINAL') {
    const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, '/');
    const folder = assetType === 'COVER' ? 'videos/covers' : 'videos/original';
    const objectKey = `${folder}/${datePrefix}/${Date.now()}-${file.originalname}`;
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
      categoryId: number;
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
    const coverAsset = await this.resolveAsset(payload.coverAssetId, payload.coverUploadToken);

    if (coverAsset) {
      coverUrl = coverAsset.url;
    }

    const video = await this.prisma.video.create({
      data: {
        creatorId: user.id,
        title: payload.title,
        description: payload.description ?? '',
        categoryId: payload.categoryId,
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
    payload: { title?: string; description?: string; categoryId?: number; coverUrl?: string },
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
        ...(payload.categoryId !== undefined ? { categoryId: payload.categoryId } : {}),
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

  async getRelatedVideos(id: number, currentUserId?: number) {
    const current = await this.prisma.video.findUnique({ where: { id } });

    if (!current) {
      throw new NotFoundException('Video not found');
    }

    const recommendationContext = await this.getRecommendationContext(currentUserId);
    const primaryCandidates = await this.prisma.video.findMany({
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
      orderBy: this.buildVideoOrderBy('hot'),
      take: 24,
    });

    const fallbackCandidates = await this.prisma.video.findMany({
      where: {
        status: 'PUBLISHED',
        id: {
          notIn: [id, ...primaryCandidates.map((item) => item.id)],
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
      orderBy: this.buildVideoOrderBy('hot'),
      take: 36,
    });

    const candidates = [...primaryCandidates, ...fallbackCandidates];
    const now = new Date();

    return candidates
      .map((video) => ({
        video,
        score: this.calculateRelatedRecommendationScore(video, current, now, recommendationContext),
      }))
      .sort(
        (left, right) =>
          right.score - left.score ||
          (right.video.publishedAt?.getTime() ?? 0) - (left.video.publishedAt?.getTime() ?? 0) ||
          right.video.id - left.video.id,
      )
      .slice(0, 6)
      .map((item) => item.video);
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
    if (options.sortBy === 'latest' || options.sortBy === 'hot') {
      return this.listPublishedVideos(options);
    }

    return this.getDiversifiedRecommendFeed(options);
  }

  private async listPublishedVideos(options: VideoListOptions = {}) {
    const page = this.normalizePage(options.page);
    const pageSize = this.normalizePageSize(options.pageSize);
    const categoryId = resolveCategoryId(options.categoryCode);

    return this.prisma.video.findMany({
      where: {
        status: 'PUBLISHED',
        ...(categoryId ? { categoryId } : {}),
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

  private async getDiversifiedRecommendFeed(options: VideoListOptions = {}) {
    const page = this.normalizePage(options.page);
    const pageSize = this.normalizePageSize(options.pageSize);
    const categoryId = resolveCategoryId(options.categoryCode);
    const candidateTake = this.getRecommendCandidateTake(page, pageSize);
    const recommendationContext = await this.getRecommendationContext(options.currentUserId);

    const candidates = await this.prisma.video.findMany({
      where: {
        status: 'PUBLISHED',
        ...(categoryId ? { categoryId } : {}),
      },
      include: {
        creator: {
          select: {
            id: true,
            nickname: true,
          },
        },
      },
      orderBy: this.buildVideoOrderBy('hot'),
      take: candidateTake,
    });

    return this.rerankRecommendCandidates(candidates, page, pageSize, recommendationContext);
  }

  async searchPublishedVideos(keyword: string, options: VideoListOptions = {}) {
    const page = this.normalizePage(options.page);
    const pageSize = this.normalizePageSize(options.pageSize);
    const categoryId = resolveCategoryId(options.categoryCode);
    const normalizedKeyword = keyword.trim();

    if (options.sortBy === 'latest' || options.sortBy === 'hot') {
      return this.prisma.video.findMany({
        where: {
          status: 'PUBLISHED',
          ...(categoryId ? { categoryId } : {}),
          ...(normalizedKeyword
            ? {
                OR: [
                  {
                    title: {
                      contains: normalizedKeyword,
                    },
                  },
                  {
                    description: {
                      contains: normalizedKeyword,
                    },
                  },
                  {
                    creator: {
                      nickname: {
                        contains: normalizedKeyword,
                      },
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

    if (!normalizedKeyword) {
      return this.getRecommendFeed({
        currentUserId: options.currentUserId,
        categoryCode: options.categoryCode,
        page,
        pageSize,
      });
    }

    const recommendationContext = await this.getRecommendationContext(options.currentUserId);
    const tokens = this.tokenizeSearchKeyword(normalizedKeyword);
    const recallTerms = [...new Set([normalizedKeyword.toLowerCase(), ...tokens])];
    const candidateTake = Math.min(120, Math.max(page * pageSize * 6, 60));
    const candidates = await this.prisma.video.findMany({
      where: {
        status: 'PUBLISHED',
        ...(categoryId ? { categoryId } : {}),
        OR: recallTerms.flatMap((term) => [
          {
            title: {
              contains: term,
            },
          },
          {
            description: {
              contains: term,
            },
          },
          {
            creator: {
              nickname: {
                contains: term,
              },
            },
          },
        ]),
      },
      include: {
        creator: {
          select: {
            id: true,
            nickname: true,
          },
        },
      },
      orderBy: this.buildVideoOrderBy('hot'),
      take: candidateTake,
    });
    const now = new Date();

    return candidates
      .map((video) => ({
        video,
        score: this.calculateSearchRankingScore(video, normalizedKeyword, tokens, now, recommendationContext),
      }))
      .filter((item) => item.score > 0)
      .sort(
        (left, right) =>
          right.score - left.score ||
          (right.video.publishedAt?.getTime() ?? 0) - (left.video.publishedAt?.getTime() ?? 0) ||
          right.video.id - left.video.id,
      )
      .slice((page - 1) * pageSize, page * pageSize)
      .map((item) => item.video);
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

  async recordPlay(
    videoId: number,
    user: { id: number },
    payload: { videoDurationSeconds?: number } = {},
  ) {
    const video = await this.requirePublishedVideo(videoId);
    const now = new Date();
    const resolvedDurationSeconds = this.resolveWatchDurationSeconds(
      video.durationSeconds,
      payload.videoDurationSeconds,
    );

    const durationData =
      resolvedDurationSeconds > 0
        ? {
            videoDurationSeconds: resolvedDurationSeconds,
          }
        : {};

    const record = await this.prisma.userVideoWatch.upsert({
      where: {
        userId_videoId: {
          userId: user.id,
          videoId,
        },
      },
      create: {
        userId: user.id,
        videoId,
        playCount: 1,
        lastWatchedAt: now,
        ...durationData,
      },
      update: {
        playCount: {
          increment: 1,
        },
        lastWatchedAt: now,
        ...durationData,
      },
    });

    await this.userProfileService.buildAndSaveProfile(user.id);
    return record;
  }

  async recordWatchProgress(
    videoId: number,
    user: { id: number },
    payload: {
      watchedSeconds: number;
      currentTimeSeconds: number;
      videoDurationSeconds?: number;
      event: 'pause' | 'leave' | 'ended';
    },
  ) {
    const video = await this.requirePublishedVideo(videoId);
    const existing = await this.prisma.userVideoWatch.findUnique({
      where: {
        userId_videoId: {
          userId: user.id,
          videoId,
        },
      },
    });

    const resolvedDurationSeconds = this.resolveWatchDurationSeconds(
      video.durationSeconds,
      payload.videoDurationSeconds,
      existing?.videoDurationSeconds,
    );
    const watchedSeconds = this.normalizeReportedWatchSeconds(payload.watchedSeconds);
    const currentTimeSeconds = this.normalizeCurrentTimeSeconds(payload.currentTimeSeconds, resolvedDurationSeconds);
    const watchRatio = this.calculateWatchRatio(currentTimeSeconds, resolvedDurationSeconds);
    const shouldIncrementCompleted = this.shouldIncrementCompleted(existing?.maxWatchRatio ?? 0, watchRatio, payload.event);
    const now = new Date();

    const durationData =
      resolvedDurationSeconds > 0
        ? {
            videoDurationSeconds: resolvedDurationSeconds,
          }
        : {};

    const record = existing
      ? await this.prisma.userVideoWatch.update({
          where: { id: existing.id },
          data: {
            totalWatchDurationSeconds: {
              increment: watchedSeconds,
            },
            lastWatchDurationSeconds: currentTimeSeconds,
            maxWatchRatio: Math.max(existing.maxWatchRatio, watchRatio),
            lastWatchRatio: watchRatio,
            completedCount: shouldIncrementCompleted ? { increment: 1 } : undefined,
            lastWatchedAt: now,
            ...durationData,
          },
        })
      : await this.prisma.userVideoWatch.create({
          data: {
            userId: user.id,
            videoId,
            totalWatchDurationSeconds: watchedSeconds,
            lastWatchDurationSeconds: currentTimeSeconds,
            maxWatchRatio: watchRatio,
            lastWatchRatio: watchRatio,
            completedCount: shouldIncrementCompleted ? 1 : 0,
            lastWatchedAt: now,
            ...durationData,
          },
        });

    await this.userProfileService.buildAndSaveProfile(user.id);
    return record;
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

  private resolveWatchDurationSeconds(...durations: Array<number | null | undefined>) {
    const validDurations = durations
      .map((item) => (typeof item === 'number' && Number.isFinite(item) ? Math.max(0, Math.round(item)) : 0))
      .filter((item) => item > 0);

    if (validDurations.length === 0) {
      return 0;
    }

    return Math.max(...validDurations);
  }

  private normalizeReportedWatchSeconds(value: number) {
    if (!Number.isFinite(value) || value <= 0) {
      return 0;
    }

    return Math.min(Math.round(value), VIDEO_WATCH_THRESHOLDS.maxReportedSecondsPerRequest);
  }

  private normalizeCurrentTimeSeconds(value: number, videoDurationSeconds: number) {
    if (!Number.isFinite(value) || value <= 0) {
      return 0;
    }

    const normalizedValue = Math.round(value);

    if (videoDurationSeconds <= 0) {
      return normalizedValue;
    }

    return Math.min(normalizedValue, videoDurationSeconds);
  }

  private calculateWatchRatio(currentTimeSeconds: number, videoDurationSeconds: number) {
    if (videoDurationSeconds <= 0) {
      return 0;
    }

    return Math.min(currentTimeSeconds / videoDurationSeconds, 1);
  }

  private shouldIncrementCompleted(previousMaxWatchRatio: number, currentWatchRatio: number, event: 'pause' | 'leave' | 'ended') {
    if (currentWatchRatio < VIDEO_WATCH_THRESHOLDS.completeRatio) {
      return false;
    }

    // `ended` should count as a fresh completion for replay scenarios.
    // Pause/leave only increments the first time the watch crosses the completion threshold.
    if (event === VIDEO_WATCH_EVENTS.ended) {
      return true;
    }

    return previousMaxWatchRatio < VIDEO_WATCH_THRESHOLDS.completeRatio;
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

  private buildVideoOrderBy(sortBy?: 'best' | 'hot' | 'latest') {
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

  private getRecommendCandidateTake(page: number, pageSize: number) {
    return Math.min(120, Math.max(page * pageSize * 6, 40));
  }

  // The home feed uses a simple, explainable recommendation score:
  // interaction score * time decay + a small freshness boost.
  private calculateRecommendScore(video: RecommendCandidate, now: Date) {
    const interactionScore = video.likeCount + video.favoriteCount * 2 + video.commentCount * 3;
    const publishedAt = video.publishedAt ?? new Date(0);
    const ageHours = Math.max(0, (now.getTime() - publishedAt.getTime()) / (1000 * 60 * 60));
    const timeDecay = 1 / (1 + ageHours / 48);
    const freshnessBoost = Math.max(0, 6 - ageHours / 24);

    return interactionScore * timeDecay + freshnessBoost;
  }

  private calculatePersonalizedRecommendScore(
    video: RecommendCandidate,
    now: Date,
    recommendationContext?: RecommendationContext,
  ) {
    const baseScore = this.calculateRecommendScore(video, now);

    if (!recommendationContext || recommendationContext.isColdStart) {
      return baseScore;
    }

    const categoryPreferenceScore = recommendationContext.categoryPreferenceIndex.get(video.categoryId) ?? 0;
    const creatorPreferenceScore = recommendationContext.creatorPreferenceIndex.get(video.creatorId) ?? 0;
    const activityMultiplier =
      recommendationContext.activityLevel === 'HIGH'
        ? 1.2
        : recommendationContext.activityLevel === 'MEDIUM'
          ? 1.1
          : 1;
    const tendencyBoost =
      recommendationContext.creatorViewerTendency === 'VIEWER'
        ? categoryPreferenceScore * 6
        : recommendationContext.creatorViewerTendency === 'CREATOR'
          ? creatorPreferenceScore * 6
          : 0;
    const selfVideoPenalty = video.creatorId === recommendationContext.currentUserId ? 6 : 0;

    return (
      baseScore * activityMultiplier +
      categoryPreferenceScore * 30 +
      creatorPreferenceScore * 36 +
      tendencyBoost -
      selfVideoPenalty
    );
  }

  private calculateRelatedRecommendationScore(
    video: RecommendCandidate,
    current: Pick<RecommendCandidate, 'creatorId' | 'categoryId'>,
    now: Date,
    recommendationContext?: RecommendationContext,
  ) {
    const personalizedScore = this.calculatePersonalizedRecommendScore(video, now, recommendationContext);
    const creatorMatchBoost = video.creatorId === current.creatorId ? 40 : 0;
    const categoryMatchBoost = video.categoryId === current.categoryId ? 24 : 0;
    const dualMatchBoost = creatorMatchBoost > 0 && categoryMatchBoost > 0 ? 12 : 0;

    return personalizedScore + creatorMatchBoost + categoryMatchBoost + dualMatchBoost;
  }

  private calculateSearchRankingScore(
    video: RecommendCandidate & { title: string; description: string; creator?: { nickname: string } | null },
    keyword: string,
    tokens: string[],
    now: Date,
    recommendationContext?: RecommendationContext,
  ) {
    const normalizedKeyword = keyword.toLowerCase();
    const normalizedTitle = video.title.toLowerCase();
    const normalizedDescription = video.description.toLowerCase();
    const normalizedCreator = (video.creator?.nickname ?? '').toLowerCase();
    const categoryMeta = CATEGORY_SEARCH_META.get(video.categoryId);
    const personalizedScore = this.calculatePersonalizedRecommendScore(video, now, recommendationContext);
    let relevanceScore = 0;
    let matchedTokenCount = 0;

    if (normalizedTitle === normalizedKeyword) {
      relevanceScore += 160;
    }

    if (normalizedTitle.startsWith(normalizedKeyword)) {
      relevanceScore += 90;
    }

    if (normalizedTitle.includes(normalizedKeyword)) {
      relevanceScore += 80;
    }

    if (normalizedDescription.includes(normalizedKeyword)) {
      relevanceScore += 36;
    }

    if (normalizedCreator.includes(normalizedKeyword)) {
      relevanceScore += 44;
    }

    if (categoryMeta && (categoryMeta.code.includes(normalizedKeyword) || categoryMeta.label.includes(normalizedKeyword))) {
      relevanceScore += 24;
    }

    for (const token of tokens) {
      let tokenMatched = false;

      if (normalizedTitle.includes(token)) {
        relevanceScore += 24;
        tokenMatched = true;
      }

      if (normalizedDescription.includes(token)) {
        relevanceScore += 10;
        tokenMatched = true;
      }

      if (normalizedCreator.includes(token)) {
        relevanceScore += 12;
        tokenMatched = true;
      }

      if (categoryMeta && (categoryMeta.code.includes(token) || categoryMeta.label.includes(token))) {
        relevanceScore += 8;
        tokenMatched = true;
      }

      if (tokenMatched) {
        matchedTokenCount += 1;
      }
    }

    const tokenCoverageScore = tokens.length > 0 ? (matchedTokenCount / tokens.length) * 48 : 0;
    return relevanceScore * 6 + tokenCoverageScore + personalizedScore;
  }

  // Re-rank the top candidates to avoid the first screen being dominated
  // by the same creator or category while keeping the highest-score items first.
  private rerankRecommendCandidates<T extends RecommendCandidate>(
    candidates: T[],
    page: number,
    pageSize: number,
    recommendationContext?: RecommendationContext,
  ) {
    const now = new Date();
    const ranked = candidates
      .map((video) => ({
        video,
        score: this.calculatePersonalizedRecommendScore(video, now, recommendationContext),
      }))
      .sort(
        (left, right) =>
          right.score - left.score ||
          (right.video.publishedAt?.getTime() ?? 0) - (left.video.publishedAt?.getTime() ?? 0) ||
          right.video.id - left.video.id,
      );

    const requiredCount = page * pageSize;
    const selected: T[] = [];
    const remaining = [...ranked];

    while (selected.length < requiredCount && remaining.length > 0) {
      const nextIndex = this.pickDiversifiedCandidateIndex(remaining, selected);
      const [next] = remaining.splice(nextIndex, 1);
      selected.push(next.video);
    }

    return selected.slice((page - 1) * pageSize, page * pageSize);
  }

  private pickDiversifiedCandidateIndex<T extends RecommendCandidate>(
    remaining: Array<{ video: T; score: number }>,
    selected: T[],
  ) {
    const strictIndex = remaining.findIndex(({ video }) => this.isDiversityFriendly(selected, video, true));
    if (strictIndex !== -1) {
      return strictIndex;
    }

    const relaxedIndex = remaining.findIndex(({ video }) => this.isDiversityFriendly(selected, video, false));
    return relaxedIndex !== -1 ? relaxedIndex : 0;
  }

  private isDiversityFriendly<T extends RecommendCandidate>(selected: T[], candidate: T, strict: boolean) {
    const creatorRunLength = this.getTrailingMatchCount(selected, (video) => video.creatorId === candidate.creatorId);
    const categoryRunLength = this.getTrailingMatchCount(selected, (video) => video.categoryId === candidate.categoryId);

    if (creatorRunLength >= 1) {
      return false;
    }

    if (strict) {
      return categoryRunLength < 2;
    }

    return categoryRunLength < 3;
  }

  private getTrailingMatchCount<T>(items: T[], predicate: (item: T) => boolean) {
    let count = 0;

    for (let index = items.length - 1; index >= 0; index -= 1) {
      if (!predicate(items[index])) {
        break;
      }

      count += 1;
    }

    return count;
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

  private async getRecommendationContext(currentUserId?: number): Promise<RecommendationContext | undefined> {
    if (!currentUserId) {
      return undefined;
    }

    const profile = await this.userProfileService.getProfile(currentUserId, true);

    if (profile.summary.isColdStart) {
      return {
        currentUserId,
        categoryPreferenceIndex: new Map(),
        creatorPreferenceIndex: new Map(),
        activityLevel: profile.summary.activityLevel,
        creatorViewerTendency: profile.summary.creatorViewerTendency,
        isColdStart: true,
      };
    }

    return {
      currentUserId,
      categoryPreferenceIndex: this.normalizePreferenceScores(profile.categoryPreferences, (item) => item.categoryId),
      creatorPreferenceIndex: this.normalizePreferenceScores(profile.creatorPreferences, (item) => item.creatorId),
      activityLevel: profile.summary.activityLevel,
      creatorViewerTendency: profile.summary.creatorViewerTendency,
      isColdStart: false,
    };
  }

  private normalizePreferenceScores<T extends { score: number }>(
    items: T[],
    getKey: (item: T) => number,
    maxSize = 8,
  ) {
    const limitedItems = items.slice(0, maxSize);
    const maxScore = limitedItems.reduce((result, item) => {
      const score = this.readPreferenceScore(item);
      return Math.max(result, score);
    }, 0);
    const normalized = new Map<number, number>();

    if (maxScore <= 0) {
      return normalized;
    }

    for (const item of limitedItems) {
      normalized.set(getKey(item), this.readPreferenceScore(item) / maxScore);
    }

    return normalized;
  }

  private readPreferenceScore(item: { score: number }) {
    return Number.isFinite(item.score) ? item.score : 0;
  }

  private tokenizeSearchKeyword(keyword: string) {
    const lowered = keyword.toLowerCase().trim();
    const splitTokens = lowered.split(/\s+/).filter(Boolean);

    if (splitTokens.length > 1) {
      return splitTokens;
    }

    const compact = lowered.replace(/\s+/g, '');
    if (compact.length <= 2) {
      return compact ? [compact] : [];
    }

    const grams = [];
    for (let index = 0; index < compact.length - 1; index += 1) {
      grams.push(compact.slice(index, index + 2));
      if (grams.length >= 6) {
        break;
      }
    }

    return [...new Set([compact, ...grams])];
  }
}
