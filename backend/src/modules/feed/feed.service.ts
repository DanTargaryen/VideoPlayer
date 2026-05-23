import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { VideoService } from '../video/video.service';
import { LiveService } from '../live/live.service';

export type DynamicFeedType = 'all' | 'video' | 'post' | 'live';
type DynamicFeedSource = 'following' | 'recommended';

type FeedAuthor = {
  id: string;
  username: string;
  avatar: string | null;
};

type FeedStats = {
  views?: number;
  likes?: number;
  comments?: number;
  favorites?: number;
};

type DynamicFeedItem = {
  id: string;
  type: 'video' | 'post' | 'live';
  source: DynamicFeedSource;
  author: FeedAuthor;
  actionText: string;
  title: string;
  description?: string;
  cover?: string;
  images?: string[];
  duration?: number;
  category?: string;
  createdAt: string;
  stats?: FeedStats;
  live?: {
    isLive: boolean;
    roomId?: string;
    viewerCount?: number;
  };
  score: number;
};

type PublishedVideo = {
  id: number;
  creatorId: number;
  title: string;
  description: string;
  category: string;
  coverUrl: string;
  durationSeconds: number;
  playCount: number;
  likeCount: number;
  favoriteCount: number;
  commentCount: number;
  publishedAt: Date | null;
  createdAt: Date;
  creator?: {
    id: number;
    nickname: string;
    avatarUrl?: string | null;
  } | null;
};

@Injectable()
export class FeedService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly videoService: VideoService,
    private readonly liveService: LiveService,
  ) {}

  async getDynamicFeed(options: {
    currentUserId?: number;
    type?: DynamicFeedType;
    page?: number;
    pageSize?: number;
  }) {
    const type = this.normalizeType(options.type);
    const page = this.normalizePage(options.page);
    const pageSize = this.normalizePageSize(options.pageSize);
    const requiredCount = page * pageSize + 1;
    const followingIds = await this.getFollowingIds(options.currentUserId);
    const followingIdSet = new Set(followingIds);

    const [followingVideos, recommendedVideos, liveRooms] = await Promise.all([
      this.fetchPublishedVideos({
        creatorIds: followingIds,
        take: requiredCount,
      }),
      this.fetchRecommendedVideos(options.currentUserId, requiredCount * 2, followingIds),
      this.fetchLiveRoomsWithAvatars(requiredCount * 2),
    ]);

    const followingItems = [
      ...followingVideos.map((video) => this.videoToFeedItem(video, 'following')),
      ...this.buildPostItemsFromVideos(followingVideos, 'following'),
      ...this.liveRoomsToFeedItems(liveRooms.filter((room) => followingIdSet.has(Number(room.broadcaster.id))), 'following'),
    ];

    const filteredFollowingItems = this.filterByType(followingItems, type)
      .sort((left, right) => right.score - left.score || Date.parse(right.createdAt) - Date.parse(left.createdAt))
      .slice(0, requiredCount);

    let combined = filteredFollowingItems;

    if (combined.length < requiredCount) {
      const usedIds = new Set(combined.map((item) => item.id));
      const recommendedItems = [
        ...recommendedVideos.map((video, index) => this.videoToFeedItem(video, 'recommended', index, recommendedVideos.length)),
        ...this.buildPostItemsFromVideos(recommendedVideos.slice(0, pageSize), 'recommended'),
        ...this.liveRoomsToFeedItems(
          liveRooms.filter((room) => !followingIdSet.has(Number(room.broadcaster.id))),
          'recommended',
        ),
      ]
        .filter((item) => !usedIds.has(item.id))
        .filter((item) => !options.currentUserId || item.author.id !== String(options.currentUserId));

      combined = [
        ...combined,
        ...this.filterByType(recommendedItems, type).sort(
          (left, right) => right.score - left.score || Date.parse(right.createdAt) - Date.parse(left.createdAt),
        ),
      ].slice(0, requiredCount);
    }

    const pageItems = combined.slice((page - 1) * pageSize, page * pageSize);

    return {
      list: pageItems.map((item) => this.withoutScore(item)),
      page,
      pageSize,
      hasMore: combined.length > page * pageSize,
      meta: {
        isGuest: !options.currentUserId,
        followingCount: followingIds.length,
        followingItemCount: filteredFollowingItems.length,
        recommendedItemCount: Math.max(0, combined.length - filteredFollowingItems.length),
      },
    };
  }

  async getSidebarLive(currentUserId?: number) {
    const followingIds = await this.getFollowingIds(currentUserId);
    const followingIdSet = new Set(followingIds);
    const rooms = await this.fetchLiveRoomsWithAvatars(12);

    const list = rooms
      .map((room) => ({
        id: String(room.id),
        roomId: String(room.id),
        title: room.title,
        cover: this.resolveCover(room.coverUrl, `live-${room.id}`),
        authorName: room.broadcaster.nickname,
        avatar: room.broadcaster.avatarUrl ?? null,
        viewerCount: Number(room.viewerCount ?? 0),
        category: room.category ?? 'live',
        isLive: room.status === 'LIVING',
        score:
          (followingIdSet.has(Number(room.broadcaster.id)) ? 1000 : 0) +
          Number(room.viewerCount ?? 0) * 8 +
          Date.parse(room.startedAt ?? room.createdAt ?? new Date(0).toISOString()) / 100000000,
      }))
      .filter((room) => room.isLive)
      .sort((left, right) => right.score - left.score)
      .slice(0, 5)
      .map((room) => this.withoutScore(room));

    return { list };
  }

  async getRecentUpdates(currentUserId?: number) {
    const followingIds = await this.getFollowingIds(currentUserId);

    if (followingIds.length === 0) {
      return { list: [] };
    }

    const [videos, liveRooms] = await Promise.all([
      this.fetchPublishedVideos({
        creatorIds: followingIds,
        take: 50,
      }),
      this.fetchLiveRoomsWithAvatars(20),
    ]);
    const latestByUser = new Map<
      number,
      {
        userId: string;
        username: string;
        avatar: string | null;
        lastActionText: string;
        lastUpdateAt: string;
      }
    >();

    for (const video of videos) {
      const updatedAt = this.resolveVideoTime(video).toISOString();
      const previous = latestByUser.get(video.creatorId);
      if (!previous || Date.parse(updatedAt) > Date.parse(previous.lastUpdateAt)) {
        latestByUser.set(video.creatorId, {
          userId: String(video.creatorId),
          username: video.creator?.nickname ?? `用户 ${video.creatorId}`,
          avatar: video.creator?.avatarUrl ?? null,
          lastActionText: '发布了新视频',
          lastUpdateAt: updatedAt,
        });
      }
    }

    for (const room of liveRooms.filter((item) => followingIds.includes(Number(item.broadcaster.id)))) {
      const updatedAt = room.startedAt ?? room.createdAt ?? new Date().toISOString();
      const userId = Number(room.broadcaster.id);
      const previous = latestByUser.get(userId);
      if (!previous || Date.parse(updatedAt) > Date.parse(previous.lastUpdateAt)) {
        latestByUser.set(userId, {
          userId: String(userId),
          username: room.broadcaster.nickname,
          avatar: room.broadcaster.avatarUrl ?? null,
          lastActionText: room.status === 'LIVING' ? '正在直播' : '创建了直播间',
          lastUpdateAt: updatedAt,
        });
      }
    }

    return {
      list: Array.from(latestByUser.values())
        .sort((left, right) => Date.parse(right.lastUpdateAt) - Date.parse(left.lastUpdateAt))
        .slice(0, 6),
    };
  }

  async getRecommendedUsers(currentUserId?: number) {
    const followingIds = await this.getFollowingIds(currentUserId);
    const excludedIds = [currentUserId, ...followingIds].filter((id): id is number => Boolean(id));
    const users = await this.prisma.user.findMany({
      where: excludedIds.length > 0 ? { id: { notIn: excludedIds } } : {},
      select: {
        id: true,
        nickname: true,
        avatarUrl: true,
        bio: true,
        createdVideos: {
          where: { status: 'PUBLISHED' },
          orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
          take: 1,
          select: {
            category: true,
            publishedAt: true,
            likeCount: true,
            favoriteCount: true,
            commentCount: true,
            playCount: true,
          },
        },
        _count: {
          select: {
            createdVideos: true,
            followerRelations: true,
          },
        },
      },
      take: 40,
    });

    const list = users
      .map((user) => {
        const latestVideo = user.createdVideos[0];
        const latestTime = latestVideo?.publishedAt?.getTime() ?? 0;
        const activityScore =
          (latestVideo?.likeCount ?? 0) * 2 +
          (latestVideo?.favoriteCount ?? 0) * 2 +
          (latestVideo?.commentCount ?? 0) * 3 +
          (latestVideo?.playCount ?? 0) * 0.05;

        return {
          userId: String(user.id),
          username: user.nickname,
          avatar: user.avatarUrl ?? null,
          bio: user.bio ?? undefined,
          followerCount: user._count.followerRelations,
          reason: latestVideo ? `${this.formatCategoryLabel(latestVideo.category)}区近期活跃` : '平台新创作者',
          followed: false,
          score: user._count.followerRelations * 12 + user._count.createdVideos * 5 + activityScore + latestTime / 100000000,
        };
      })
      .sort((left, right) => right.score - left.score)
      .slice(0, 6)
      .map((user) => this.withoutScore(user));

    return { list };
  }

  private async getFollowingIds(currentUserId?: number) {
    if (!currentUserId) {
      return [];
    }

    const relations = await this.prisma.followRelation.findMany({
      where: { followerId: currentUserId },
      select: { followingId: true },
      orderBy: { createdAt: 'desc' },
    });

    return relations.map((item) => item.followingId);
  }

  private async fetchPublishedVideos(options: { creatorIds?: number[]; take: number }) {
    if (options.creatorIds && options.creatorIds.length === 0) {
      return [];
    }

    return this.prisma.video.findMany({
      where: {
        status: 'PUBLISHED',
        ...(options.creatorIds ? { creatorId: { in: options.creatorIds } } : {}),
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
      orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
      take: Math.min(120, Math.max(1, options.take)),
    }) as Promise<PublishedVideo[]>;
  }

  private async fetchRecommendedVideos(currentUserId: number | undefined, take: number, followingIds: number[]) {
    const videos = (await this.videoService.getRecommendFeed({
      currentUserId,
      page: 1,
      pageSize: Math.min(50, Math.max(10, take)),
    })) as PublishedVideo[];
    const blockedCreatorIds = new Set([currentUserId, ...followingIds].filter((id): id is number => Boolean(id)));

    return videos.filter((video) => !blockedCreatorIds.has(video.creatorId));
  }

  private async fetchLiveRoomsWithAvatars(limit: number) {
    const rooms = this.liveService.listRooms({ status: 'LIVING', limit });
    const broadcasterIds = Array.from(new Set(rooms.map((room) => Number(room.broadcaster.id))));
    const users =
      broadcasterIds.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: broadcasterIds } },
            select: { id: true, avatarUrl: true },
          })
        : [];
    const avatarIndex = new Map(users.map((user) => [user.id, user.avatarUrl] as const));

    return rooms.map((room) => ({
      ...room,
      broadcaster: {
        ...room.broadcaster,
        avatarUrl: avatarIndex.get(Number(room.broadcaster.id)) ?? null,
      },
    }));
  }

  private videoToFeedItem(
    video: PublishedVideo,
    source: DynamicFeedSource,
    recommendationIndex = 0,
    recommendationTotal = 1,
  ): DynamicFeedItem {
    const createdAt = this.resolveVideoTime(video).toISOString();
    return {
      id: `video-${video.id}`,
      type: 'video',
      source,
      author: this.videoAuthor(video),
      actionText: source === 'following' ? '发布了新视频' : '推荐给你',
      title: video.title,
      description: video.description,
      cover: this.resolveCover(video.coverUrl, `video-${video.id}`),
      duration: video.durationSeconds,
      category: this.formatCategoryLabel(video.category),
      createdAt,
      stats: {
        views: video.playCount,
        likes: video.likeCount,
        comments: video.commentCount,
        favorites: video.favoriteCount,
      },
      score: this.calculateDynamicScore({
        createdAt,
        views: video.playCount,
        likes: video.likeCount,
        comments: video.commentCount,
        favorites: video.favoriteCount,
        source,
        recommendationScore: this.rankToRecommendationScore(recommendationIndex, recommendationTotal),
      }),
    };
  }

  private buildPostItemsFromVideos(videos: PublishedVideo[], source: DynamicFeedSource) {
    return videos.slice(0, 12).map((video, index): DynamicFeedItem => {
      const createdAt = new Date(this.resolveVideoTime(video).getTime() + 30_000).toISOString();
      return {
        id: `post-${video.id}`,
        type: 'post',
        source,
        author: this.videoAuthor(video),
        actionText: source === 'following' ? '发布了图文动态' : '推荐给你',
        title: video.title,
        description: video.description || `分享一个关于「${video.title}」的新想法。`,
        cover: this.resolveCover(video.coverUrl, `post-${video.id}`),
        images: [
          this.resolveCover(video.coverUrl, `post-${video.id}-1`),
          this.resolveCover(video.coverUrl, `post-${video.id}-2`),
          this.resolveCover(video.coverUrl, `post-${video.id}-3`),
        ],
        category: this.formatCategoryLabel(video.category),
        createdAt,
        stats: {
          likes: Math.max(0, Math.round(video.likeCount * 0.8)),
          comments: Math.max(0, Math.round(video.commentCount * 0.7)),
          favorites: Math.max(0, Math.round(video.favoriteCount * 0.5)),
        },
        score: this.calculateDynamicScore({
          createdAt,
          views: video.playCount,
          likes: video.likeCount,
          comments: video.commentCount,
          favorites: video.favoriteCount,
          source,
          recommendationScore: source === 'following' ? 0.78 : this.rankToRecommendationScore(index, videos.length),
        }),
      };
    });
  }

  private liveRoomsToFeedItems(rooms: Awaited<ReturnType<FeedService['fetchLiveRoomsWithAvatars']>>, source: DynamicFeedSource) {
    return rooms.map((room): DynamicFeedItem => {
      const createdAt = room.startedAt ?? room.createdAt ?? new Date().toISOString();
      return {
        id: `live-${room.id}`,
        type: 'live',
        source,
        author: {
          id: String(room.broadcaster.id),
          username: room.broadcaster.nickname,
          avatar: room.broadcaster.avatarUrl ?? null,
        },
        actionText: room.status === 'LIVING' ? '正在直播' : '创建了直播间',
        title: room.title,
        description: room.status === 'LIVING' ? '直播中，点击进入直播间' : '直播预告',
        cover: this.resolveCover(room.coverUrl, `live-${room.id}`),
        category: this.formatCategoryLabel(room.category),
        createdAt,
        stats: {
          views: Number(room.viewerCount ?? 0),
        },
        live: {
          isLive: room.status === 'LIVING',
          roomId: String(room.id),
          viewerCount: Number(room.viewerCount ?? 0),
        },
        score: this.calculateDynamicScore({
          createdAt,
          views: Number(room.viewerCount ?? 0),
          likes: 0,
          comments: 0,
          favorites: 0,
          source,
          recommendationScore: source === 'following' ? 0.88 : 0.65,
        }),
      };
    });
  }

  private filterByType(items: DynamicFeedItem[], type: DynamicFeedType) {
    if (type === 'all') {
      return items;
    }

    return items.filter((item) => item.type === type);
  }

  private calculateDynamicScore(input: {
    createdAt: string;
    views?: number;
    likes?: number;
    comments?: number;
    favorites?: number;
    source: DynamicFeedSource;
    recommendationScore: number;
  }) {
    const ageHours = Math.max(0, (Date.now() - Date.parse(input.createdAt)) / 3_600_000);
    const recencyScore = 1 / (1 + ageHours / 48);
    const popularityRaw =
      (input.views ?? 0) * 0.15 +
      (input.likes ?? 0) * 2.2 +
      (input.comments ?? 0) * 3.2 +
      (input.favorites ?? 0) * 2.6;
    const popularityScore = Math.min(1, Math.log10(popularityRaw + 1) / 5);
    const followBoost = input.source === 'following' ? 1 : 0;

    return (
      0.45 * recencyScore +
      0.35 * input.recommendationScore +
      0.15 * popularityScore +
      0.05 * followBoost
    );
  }

  private rankToRecommendationScore(index: number, total: number) {
    if (total <= 1) {
      return 0.7;
    }

    return Math.max(0.45, 1 - index / total);
  }

  private videoAuthor(video: PublishedVideo): FeedAuthor {
    return {
      id: String(video.creator?.id ?? video.creatorId),
      username: video.creator?.nickname ?? `用户 ${video.creatorId}`,
      avatar: video.creator?.avatarUrl ?? null,
    };
  }

  private resolveVideoTime(video: PublishedVideo) {
    return video.publishedAt ?? video.createdAt ?? new Date(0);
  }

  private resolveCover(url: string | null | undefined, seed: string) {
    return url?.trim() || `https://picsum.photos/seed/guanlan-${encodeURIComponent(seed)}/960/540`;
  }

  private formatCategoryLabel(category?: string | null) {
    const labels: Record<string, string> = {
      entertainment: '娱乐',
      study: '学习',
      game: '游戏',
      tech: '科技',
      live: '直播',
    };

    return labels[category ?? ''] ?? category ?? '推荐';
  }

  private normalizeType(type?: DynamicFeedType) {
    return type && ['all', 'video', 'post', 'live'].includes(type) ? type : 'all';
  }

  private normalizePage(page?: number) {
    if (!page || !Number.isFinite(page) || page < 1) {
      return 1;
    }

    return Math.floor(page);
  }

  private normalizePageSize(pageSize?: number) {
    if (!pageSize || !Number.isFinite(pageSize) || pageSize < 1) {
      return 10;
    }

    return Math.min(30, Math.floor(pageSize));
  }

  private withoutScore<T extends { score: number }>(item: T) {
    const copy: Omit<T, 'score'> & { score?: number } = { ...item };
    delete copy.score;
    return copy;
  }
}
