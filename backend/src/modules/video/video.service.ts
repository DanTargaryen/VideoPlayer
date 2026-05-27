import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Express } from 'express';

import { CATEGORY_DEFINITIONS, resolveCategoryCode, resolveCategoryId } from '../../common/constants/categories';
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

export interface RecommendCandidate {
  id: number;
  creatorId: number;
  category: string;
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

const CATEGORY_SEARCH_META = new Map<string, { code: string; label: string }>(
  CATEGORY_DEFINITIONS.filter((item) => item.id !== null).map((item) => [
    item.code,
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

    if (!['DRAFT', 'REJECTED', 'PENDING_REVIEW', 'PUBLISHED'].includes(video.status)) {
      throw new ForbiddenException('Only draft, rejected, pending review, or published videos can be edited');
    }

    if (video.status === 'PENDING_REVIEW' || video.status === 'PUBLISHED') {
      await this.prisma.$transaction([
        this.prisma.video.update({
          where: { id: videoId },
          data: {
            ...(payload.title !== undefined ? { title: payload.title } : {}),
            ...(payload.description !== undefined ? { description: payload.description } : {}),
            ...(payload.category !== undefined ? { category: payload.category } : {}),
            ...(payload.coverUrl !== undefined ? { coverUrl: payload.coverUrl } : {}),
            status: 'DRAFT',
            submittedAt: null,
            publishedAt: null,
          },
        }),
        this.prisma.videoReview.deleteMany({
          where: {
            videoId,
            status: 'PENDING',
          },
        }),
      ]);

      return this.prisma.video.findUnique({ where: { id: videoId } });
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

  async deleteCreatorVideo(videoId: number, user: { id: number; role: 'USER' | 'ADMIN' }) {
    const video = await this.prisma.video.findUnique({
      where: { id: videoId },
      include: {
        assets: {
          select: {
            bucket: true,
            objectKey: true,
          },
        },
        comments: {
          select: {
            id: true,
          },
        },
        danmakus: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    if (video.creatorId !== user.id && user.role !== 'ADMIN') {
      throw new ForbiddenException('Cannot delete others videos');
    }

    const commentIds = video.comments.map((item) => item.id);
    const danmakuIds = video.danmakus.map((item) => item.id);
    const reportWhere = {
      OR: [
        { videoId },
        ...(commentIds.length > 0 ? [{ commentId: { in: commentIds } }] : []),
        ...(danmakuIds.length > 0 ? [{ danmakuId: { in: danmakuIds } }] : []),
      ],
    };

    await this.prisma.$transaction(async (tx) => {
      await tx.notification.deleteMany({
        where: {
          relatedType: 'VIDEO',
          relatedId: videoId,
        },
      });
      await tx.userVideoWatch.deleteMany({ where: { videoId } });
      await tx.coinTransaction.updateMany({ where: { videoId }, data: { videoId: null } });
      await tx.videoCoinContribution.deleteMany({ where: { videoId } });
      await tx.videoLike.deleteMany({ where: { videoId } });
      await tx.favorite.deleteMany({ where: { videoId } });
      await tx.reportRecord.deleteMany({ where: reportWhere });
      await tx.commentAiTask.deleteMany({ where: { videoId } });
      await tx.videoAiSummary.deleteMany({ where: { videoId } });
      await tx.videoDanmaku.deleteMany({ where: { videoId } });
      await tx.comment.deleteMany({ where: { videoId } });
      await tx.videoReview.deleteMany({ where: { videoId } });
      await tx.videoAsset.deleteMany({ where: { videoId } });
      await tx.video.delete({ where: { id: videoId } });
    });

    for (const asset of video.assets) {
      try {
        await this.minioService.deleteFile(asset.bucket, asset.objectKey);
      } catch {
      }
    }

    return {
      deleted: true,
      videoId,
    };
  }

  async withdrawReview(videoId: number, user: { id: number; role: 'USER' | 'ADMIN' }) {
    const video = await this.prisma.video.findUnique({ where: { id: videoId } });

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    if (video.creatorId !== user.id && user.role !== 'ADMIN') {
      throw new ForbiddenException('Cannot withdraw others videos');
    }

    if (video.status !== 'PENDING_REVIEW') {
      throw new ForbiddenException('Only pending review videos can be withdrawn');
    }

    await this.prisma.$transaction([
      this.prisma.video.update({
        where: { id: videoId },
        data: {
          status: 'DRAFT',
          submittedAt: null,
        },
      }),
      this.prisma.videoReview.deleteMany({
        where: {
          videoId,
          status: 'PENDING',
        },
      }),
    ]);

    return this.prisma.video.findUnique({ where: { id: videoId } });
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
    const myCoinCount = currentUserId
      ? (await this.prisma.videoCoinContribution.findUnique({
          where: { videoId_userId: { videoId: id, userId: currentUserId } },
        }))?.amount ?? 0
      : 0;

    return {
      ...video,
      creator: {
        id: video.creator.id,
        nickname: video.creator.nickname,
        avatarUrl: video.creator.avatarUrl,
        role: video.creator.role,
        followerCount,
      },
      isFollowingCreator,
      isLiked,
      isFavorited,
      myCoinCount,
      myCoinLimit: 5,
    };
  }

  async getRelatedVideos(id: number, currentUserId?: number, options: { limit?: number } = {}) {
    const current = await this.prisma.video.findUnique({ where: { id } });

    if (!current) {
      throw new NotFoundException('Video not found');
    }

    const recommendationContext = await this.getRecommendationContext(currentUserId);
    const primaryCandidates = await this.prisma.video.findMany({
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
            avatarUrl: true,
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
          notIn: [id, ...primaryCandidates.map((item: { id: number }) => item.id)],
        },
      },
      include: {
        creator: {
          select: {
            id: true,
            nickname: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: this.buildVideoOrderBy('hot'),
      take: 36,
    });

    const candidates = [...primaryCandidates, ...fallbackCandidates];
    const now = new Date();
    const limit = this.normalizeRelatedVideoLimit(options.limit);

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
      .slice(0, limit)
      .map((item) => item.video);
  }

  private normalizeRelatedVideoLimit(limit?: number) {
    if (!limit || !Number.isFinite(limit) || limit < 1) {
      return 6;
    }

    return Math.min(36, Math.floor(limit));
  }

  async submitReview(id: number, user: { id: number; role: 'USER' | 'ADMIN' }) {
    const video = await this.prisma.video.findUnique({ where: { id } });

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    if (video.creatorId !== user.id && user.role !== 'ADMIN') {
      throw new ForbiddenException('Cannot submit others videos');
    }

    if (!['DRAFT', 'REJECTED'].includes(video.status)) {
      throw new ForbiddenException('Only draft or rejected videos can be submitted for review');
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
            avatarUrl: true,
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
    const category = resolveCategoryCode(options.categoryCode);
    const candidateTake = this.getRecommendCandidateTake(page, pageSize);
    const recommendationContext = await this.getRecommendationContext(options.currentUserId);

    const candidates = await this.prisma.video.findMany({
      where: {
        status: 'PUBLISHED',
        ...(category ? { category } : {}),
      },
      include: {
        creator: {
          select: {
            id: true,
            nickname: true,
            avatarUrl: true,
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
    const category = resolveCategoryCode(options.categoryCode);
    const normalizedKeyword = keyword.trim();

    if (options.sortBy === 'latest' || options.sortBy === 'hot') {
      return this.prisma.video.findMany({
        where: {
          status: 'PUBLISHED',
          ...(category ? { category } : {}),
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
              avatarUrl: true,
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
        ...(category ? { category } : {}),
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
            avatarUrl: true,
          },
        },
      },
      orderBy: this.buildVideoOrderBy('hot'),
      take: candidateTake,
    });
    const now = new Date();

    return candidates
      .map((video: RecommendCandidate & { title: string; description: string; creator: { id: number; nickname: string } | null }) => ({
        video,
        score: this.calculateSearchRankingScore(video, normalizedKeyword, tokens, now, recommendationContext),
      }))
      .filter((item: { score: number }) => item.score > 0)
      .sort(
        (left: { score: number; video: { publishedAt: Date | null; id: number } }, right: { score: number; video: { publishedAt: Date | null; id: number } }) =>
          right.score - left.score ||
          (right.video.publishedAt?.getTime() ?? 0) - (left.video.publishedAt?.getTime() ?? 0) ||
          right.video.id - left.video.id,
      )
      .slice((page - 1) * pageSize, page * pageSize)
      .map((item: { video: RecommendCandidate & { title: string; description: string; creator: { id: number; nickname: string } | null } }) => item.video);
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

  async favoriteVideo(
    videoId: number,
    user: { id: number; nickname: string },
    payload: { folderId?: number } = {},
  ) {
    const video = await this.requirePublishedVideo(videoId);
    const defaultFolder = await this.ensureDefaultFavoriteFolder(user.id);
    await this.migrateLegacyFavoritesToDefaultFolder(user.id, defaultFolder.id);
    const targetFolderId = payload.folderId ?? defaultFolder.id;
    const targetFolder = await this.prisma.favoriteFolder.findFirst({
      where: {
        id: targetFolderId,
        userId: user.id,
      },
    });

    if (!targetFolder) {
      throw new NotFoundException('Favorite folder not found');
    }

    const existing = await this.prisma.favorite.findUnique({
      where: { videoId_userId: { videoId, userId: user.id } },
    });

    if (!existing) {
      await this.prisma.favorite.create({
        data: { videoId, userId: user.id, folderId: targetFolder.id },
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
    } else if (existing.folderId !== targetFolder.id) {
      await this.prisma.favorite.update({
        where: { id: existing.id },
        data: { folderId: targetFolder.id },
      });
    }

    return {
      favorited: true,
      folderId: targetFolder.id,
      folderName: targetFolder.name,
    };
  }

  async coinVideo(videoId: number, user: { id: number }, amount: number) {
    if (!Number.isInteger(amount) || amount < 1 || amount > 5) {
      throw new BadRequestException('投币数量必须是 1 到 5 的整数');
    }

    return this.prisma.$transaction(async (tx) => {
      const video = await tx.video.findUnique({ where: { id: videoId } });

      if (!video || video.status !== 'PUBLISHED') {
        throw new NotFoundException('Video not found');
      }

      const existing = await tx.videoCoinContribution.findUnique({
        where: { videoId_userId: { videoId, userId: user.id } },
      });
      const existingAmount = existing?.amount ?? 0;

      if (existingAmount + amount > 5) {
        throw new BadRequestException('每个视频最多投币 5 个');
      }

      const userUpdate = await tx.user.updateMany({
        where: { id: user.id, coinBalance: { gte: amount } },
        data: { coinBalance: { decrement: amount } },
      });

      if (userUpdate.count !== 1) {
        throw new BadRequestException('余额不足，请每日打卡获取货币');
      }

      let userVideoCoinCount = amount;
      if (existing) {
        const contributionUpdate = await tx.videoCoinContribution.updateMany({
          where: { id: existing.id, amount: { lte: 5 - amount } },
          data: { amount: { increment: amount } },
        });

        if (contributionUpdate.count !== 1) {
          throw new BadRequestException('每个视频最多投币 5 个');
        }
        userVideoCoinCount = existing.amount + amount;
      } else {
        await tx.videoCoinContribution.create({
          data: { videoId, userId: user.id, amount },
        });
      }

      const [updatedUser, updatedVideo] = await Promise.all([
        tx.user.findUniqueOrThrow({ where: { id: user.id } }),
        tx.video.update({
          where: { id: videoId },
          data: { coinCount: { increment: amount } },
        }),
      ]);

      await tx.coinTransaction.create({
        data: {
          userId: user.id,
          type: 'VIDEO_COIN',
          amount: -amount,
          balanceAfter: updatedUser.coinBalance,
          videoId,
        },
      });

      return {
        videoId,
        amount,
        userVideoCoinCount,
        videoCoinCount: updatedVideo.coinCount,
        balance: updatedUser.coinBalance,
      };
    });
  }

  async recordPlay(
    videoId: number,
    user: { id: number } | null,
    payload: { videoDurationSeconds?: number } = {},
  ) {
    const video = await this.requirePublishedVideo(videoId);
    const now = new Date();
    const statDate = this.formatStatDate(now);
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

    const updatedVideo = await this.prisma.video.update({
      where: { id: videoId },
      data: {
        playCount: {
          increment: 1,
        },
      },
      select: {
        playCount: true,
      },
    });

    await this.prisma.creatorPlayDaily.upsert({
      where: {
        creatorId_statDate: {
          creatorId: video.creatorId,
          statDate,
        },
      },
      create: {
        creatorId: video.creatorId,
        statDate,
        playCount: 1,
      },
      update: {
        playCount: {
          increment: 1,
        },
      },
    });

    let record = null;

    if (user) {
      record = await this.prisma.userVideoWatch.upsert({
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
    }

    return {
      videoId,
      playCount: updatedVideo.playCount,
      watchRecord: record,
    };
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

  async getUserFavorites(userId: number, folderId?: number) {
    const defaultFolder = await this.ensureDefaultFavoriteFolder(userId);
    await this.migrateLegacyFavoritesToDefaultFolder(userId, defaultFolder.id);
    const resolvedFolderId = folderId ?? defaultFolder.id;
    const folder = await this.prisma.favoriteFolder.findFirst({
      where: {
        id: resolvedFolderId,
        userId,
      },
    });

    if (!folder) {
      throw new NotFoundException('Favorite folder not found');
    }

    const favorites = await this.prisma.favorite.findMany({
      where: {
        userId,
        folderId: resolvedFolderId,
        video: {
          status: 'PUBLISHED',
        },
      },
      include: {
        video: {
          include: {
            creator: { select: { id: true, nickname: true, avatarUrl: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return favorites.map((f: { video: { id: number; title: string; description: string; coverUrl: string; category: string; likeCount: number; favoriteCount: number; commentCount: number; creator: { id: number; nickname: string } }; createdAt: Date }) => ({
      id: f.video.id,
      title: f.video.title,
      description: f.video.description,
      coverUrl: f.video.coverUrl,
      category: f.video.category,
      likeCount: f.video.likeCount,
      favoriteCount: f.video.favoriteCount,
      commentCount: f.video.commentCount,
      creator: f.video.creator,
      favoritedAt: f.createdAt,
      folderId: f.folderId,
    }));
  }

  async listFavoriteFolders(userId: number) {
    const defaultFolder = await this.ensureDefaultFavoriteFolder(userId);
    await this.migrateLegacyFavoritesToDefaultFolder(userId, defaultFolder.id);

    const folders = await this.prisma.favoriteFolder.findMany({
      where: { userId },
      include: {
        _count: {
          select: {
            favorites: true,
          },
        },
      },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }, { createdAt: 'asc' }],
    });

    return folders.map((folder) => ({
      id: folder.id,
      name: folder.name,
      isDefault: folder.isDefault,
      videoCount: folder._count.favorites,
      createdAt: folder.createdAt,
      updatedAt: folder.updatedAt,
    }));
  }

  async createFavoriteFolder(userId: number, name: string) {
    const trimmedName = name.trim();

    if (!trimmedName) {
      throw new BadRequestException('Favorite folder name is required');
    }

    if (trimmedName.length > 64) {
      throw new BadRequestException('Favorite folder name is too long');
    }

    await this.ensureDefaultFavoriteFolder(userId);

    if (trimmedName === '默认收藏夹') {
      throw new BadRequestException('Default favorite folder name is reserved');
    }

    const existing = await this.prisma.favoriteFolder.findFirst({
      where: {
        userId,
        name: trimmedName,
      },
    });

    if (existing) {
      throw new BadRequestException('Favorite folder name already exists');
    }

    const folder = await this.prisma.favoriteFolder.create({
      data: {
        userId,
        name: trimmedName,
      },
    });

    return {
      id: folder.id,
      name: folder.name,
      isDefault: folder.isDefault,
      videoCount: 0,
      createdAt: folder.createdAt,
      updatedAt: folder.updatedAt,
    };
  }

  async deleteFavoriteFolder(userId: number, folderId: number) {
    const defaultFolder = await this.ensureDefaultFavoriteFolder(userId);
    await this.migrateLegacyFavoritesToDefaultFolder(userId, defaultFolder.id);

    const folder = await this.prisma.favoriteFolder.findFirst({
      where: {
        id: folderId,
        userId,
      },
    });

    if (!folder) {
      throw new NotFoundException('Favorite folder not found');
    }

    if (folder.isDefault) {
      throw new BadRequestException('Default favorite folder cannot be deleted');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.favorite.updateMany({
        where: {
          userId,
          folderId: folder.id,
        },
        data: {
          folderId: defaultFolder.id,
        },
      });

      await tx.favoriteFolder.delete({
        where: { id: folder.id },
      });
    });

    return {
      deleted: true,
      folderId,
      movedToFolderId: defaultFolder.id,
    };
  }

  async getUserLikes(userId: number) {
    const likes = await this.prisma.videoLike.findMany({
      where: {
        userId,
        video: {
          status: 'PUBLISHED',
        },
      },
      include: {
        video: {
          include: {
            creator: { select: { id: true, nickname: true, avatarUrl: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return likes.map((l: { video: { id: number; title: string; description: string; coverUrl: string; category: string; likeCount: number; favoriteCount: number; commentCount: number; creator: { id: number; nickname: string } }; createdAt: Date }) => ({
      id: l.video.id,
      title: l.video.title,
      description: l.video.description,
      coverUrl: l.video.coverUrl,
      category: l.video.category,
      likeCount: l.video.likeCount,
      favoriteCount: l.video.favoriteCount,
      commentCount: l.video.commentCount,
      creator: l.video.creator,
      likedAt: l.createdAt,
    }));
  }

  async getUserHistory(userId: number) {
    const history = await this.prisma.userVideoWatch.findMany({
      where: {
        userId,
        video: {
          status: 'PUBLISHED',
        },
      },
      include: {
        video: {
          include: {
            creator: { select: { id: true, nickname: true, avatarUrl: true } },
          },
        },
      },
      orderBy: [{ lastWatchedAt: 'desc' }, { updatedAt: 'desc' }],
    });

    return history.map((item) => ({
      id: item.video.id,
      title: item.video.title,
      description: item.video.description,
      coverUrl: item.video.coverUrl,
      category: item.video.category,
      likeCount: item.video.likeCount,
      favoriteCount: item.video.favoriteCount,
      commentCount: item.video.commentCount,
      coinCount: item.video.coinCount,
      creator: item.video.creator,
      watchedAt: item.lastWatchedAt,
    }));
  }

  async getCreatorPlayTrend(creatorId: number, days = 7) {
    const normalizedDays = Math.max(1, Math.min(30, Math.floor(days)));
    const dateKeys = Array.from({ length: normalizedDays }, (_, index) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (normalizedDays - 1 - index));
      return this.formatStatDate(date);
    });

    const stats = await this.prisma.creatorPlayDaily.findMany({
      where: {
        creatorId,
        statDate: {
          gte: dateKeys[0],
          lte: dateKeys[dateKeys.length - 1],
        },
      },
      orderBy: { statDate: 'asc' },
    });

    const statMap = new Map(stats.map((item) => [item.statDate, item.playCount] as const));
    return dateKeys.map((date) => ({
      date,
      playCount: statMap.get(date) ?? 0,
    }));
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

    const categoryPreferenceScore =
      recommendationContext.categoryPreferenceIndex.get(this.resolveVideoCategoryId(video.category)) ?? 0;
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
    current: Pick<RecommendCandidate, 'creatorId' | 'category'>,
    now: Date,
    recommendationContext?: RecommendationContext,
  ) {
    const personalizedScore = this.calculatePersonalizedRecommendScore(video, now, recommendationContext);
    const creatorMatchBoost = video.creatorId === current.creatorId ? 40 : 0;
    const categoryMatchBoost = video.category === current.category ? 24 : 0;
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
    const categoryMeta = CATEGORY_SEARCH_META.get(video.category);
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
    const categoryRunLength = this.getTrailingMatchCount(selected, (video) => video.category === candidate.category);

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

  private async ensureDefaultFavoriteFolder(userId: number) {
    const existingDefault = await this.prisma.favoriteFolder.findFirst({
      where: {
        userId,
        isDefault: true,
      },
    });

    if (existingDefault) {
      return existingDefault;
    }

    const namedDefault = await this.prisma.favoriteFolder.findFirst({
      where: {
        userId,
        name: '默认收藏夹',
      },
    });

    if (namedDefault) {
      return this.prisma.favoriteFolder.update({
        where: { id: namedDefault.id },
        data: { isDefault: true },
      });
    }

    return this.prisma.favoriteFolder.create({
      data: {
        userId,
        name: '默认收藏夹',
        isDefault: true,
      },
    });
  }

  private async migrateLegacyFavoritesToDefaultFolder(userId: number, defaultFolderId: number) {
    await this.prisma.favorite.updateMany({
      where: {
        userId,
        folderId: null,
      },
      data: {
        folderId: defaultFolderId,
      },
    });
  }

  private formatStatDate(value: Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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
    const asciiBaseName = Array.from(baseName.normalize('NFKD'))
      .filter((char) => char.charCodeAt(0) <= 0x7f)
      .join('');
    const normalizedBase = asciiBaseName
      .replace(/[^A-Za-z0-9_-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase();
    const safeBase = normalizedBase || 'upload';

    return `${Date.now()}-${safeBase}${extension}`;
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

  private resolveVideoCategoryId(categoryCode?: string | null) {
    return resolveCategoryId(categoryCode ?? undefined) ?? 0;
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
