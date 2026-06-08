import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { VideoService } from '../video/video.service';
import { LiveService } from '../live/live.service';
import { DynamicPostsService, type DynamicPostItem } from './dynamic-posts.service';

export type DynamicFeedType = 'all' | 'video' | 'post' | 'image_text' | 'text' | 'image' | 'live';
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
  liked?: boolean;
  favorited?: boolean;
};

type DynamicFeedItem = {
  id: string;
  type: 'video' | 'image_text' | 'text' | 'image' | 'live';
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

const FOLLOW_GROUPS = [
  { id: 'study', name: '学习区', icon: 'S', categoryCodes: ['study'] },
  { id: 'programming', name: '编程区', icon: 'C', categoryCodes: ['tech'] },
  { id: 'game', name: '游戏区', icon: 'G', categoryCodes: ['game'] },
  { id: 'film', name: '影视区', icon: 'F', categoryCodes: ['film', 'entertainment', 'animation', 'music'] },
] as const;

const HOT_TOPIC_CANDIDATES = [
  { id: 'ai-agent', name: 'AI Agent', keywords: ['ai agent', 'ai智能体', '智能体', 'agent', 'aigc'] },
  { id: 'java-backend', name: 'Java后端', keywords: ['java', '后端', 'spring', 'nestjs', 'prisma'] },
  { id: 'math-model', name: '数学建模', keywords: ['数学建模', '建模', '模型', '动态规划', '优化'] },
  { id: 'game-live', name: '游戏实况', keywords: ['游戏实况', '游戏', '手柄', '独立游戏', '打机'] },
  { id: 'final-review', name: '期末复习', keywords: ['期末', '复习', '考试', '课程', '答辩'] },
  { id: 'video-tools', name: '视频工具链', keywords: ['ffmpeg', '转码', '抽帧', '封面', '上传'] },
  { id: 'campus-vlog', name: '校园Vlog', keywords: ['校园', '宿舍', 'vlog', '旅行', '生活'] },
] as const;

@Injectable()
export class FeedService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly videoService: VideoService,
    private readonly liveService: LiveService,
    private readonly dynamicPostsService: DynamicPostsService,
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

    const [followingVideos, recommendedVideos, liveRooms, dynamicPosts] = await Promise.all([
      this.fetchPublishedVideos({
        creatorIds: followingIds,
        take: requiredCount,
      }),
      this.fetchRecommendedVideos(options.currentUserId, requiredCount * 2, followingIds),
      this.fetchLiveRoomsWithAvatars(requiredCount * 2),
      this.dynamicPostsService.listPosts(options.currentUserId, requiredCount * 2),
    ]);

    const followingItems = [
      ...followingVideos.map((video) => this.videoToFeedItem(video, 'following')),
      ...dynamicPosts.list
        .filter((post) => followingIdSet.has(Number(post.author.id)) || post.author.id === String(options.currentUserId ?? ''))
        .map((post) => this.dynamicPostToFeedItem(post, 'following')),
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
        ...dynamicPosts.list
          .filter((post) => !followingIdSet.has(Number(post.author.id)))
          .map((post) => this.dynamicPostToFeedItem(post, 'recommended')),
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

    const pageItems = await this.attachInteractionState(
      combined.slice((page - 1) * pageSize, page * pageSize),
      options.currentUserId,
    );

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

  async getDynamicSidebarOverview(currentUserId?: number) {
    const [user, followingIds] = await Promise.all([
      currentUserId
        ? this.prisma.user.findUnique({
            where: { id: currentUserId },
            select: {
              _count: {
                select: {
                  followingRelations: true,
                  followerRelations: true,
                  dynamicPosts: true,
                  createdVideos: true,
                },
              },
            },
          })
        : null,
      this.getFollowingIds(currentUserId),
    ]);

    const groups = await this.buildFollowGroups(followingIds);

    return {
      profileStats: {
        followingCount: user?._count.followingRelations ?? followingIds.length,
        followerCount: user?._count.followerRelations ?? 0,
        dynamicCount: (user?._count.dynamicPosts ?? 0) + (user?._count.createdVideos ?? 0),
      },
      groups,
    };
  }

  async getHotTopics() {
    const [videos, posts] = await Promise.all([
      this.prisma.video.findMany({
        where: { status: 'PUBLISHED' },
        select: {
          title: true,
          description: true,
          category: true,
          playCount: true,
          likeCount: true,
          favoriteCount: true,
          commentCount: true,
          publishedAt: true,
          createdAt: true,
          categories: { select: { code: true } },
        },
        orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
        take: 120,
      }),
      this.prisma.dynamicPost.findMany({
        where: { status: 'NORMAL' },
        select: {
          content: true,
          likeCount: true,
          commentCount: true,
          favoriteCount: true,
          createdAt: true,
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 120,
      }),
    ]);

    const now = Date.now();
    const topicScores = HOT_TOPIC_CANDIDATES.map((topic) => {
      let discussionCount = 0;
      let recentScore = 0;

      for (const video of videos) {
        const corpus = [
          video.title,
          video.description,
          video.category,
          ...video.categories.map((category) => category.code),
        ]
          .join(' ')
          .toLowerCase();
        if (!topic.keywords.some((keyword) => corpus.includes(keyword.toLowerCase()))) {
          continue;
        }

        const score = Math.round(
          Number(video.playCount ?? 0) / 18 +
            Number(video.likeCount ?? 0) * 8 +
            Number(video.favoriteCount ?? 0) * 5 +
            Number(video.commentCount ?? 0) * 22 +
            180,
        );
        discussionCount += score;
        if (now - this.resolveVideoTime(video).getTime() < 72 * 60 * 60 * 1000) {
          recentScore += score;
        }
      }

      for (const post of posts) {
        const corpus = post.content.toLowerCase();
        if (!topic.keywords.some((keyword) => corpus.includes(keyword.toLowerCase()))) {
          continue;
        }

        const score = Math.round(
          Number(post.likeCount ?? 0) * 8 +
            Number(post.favoriteCount ?? 0) * 5 +
            Number(post.commentCount ?? 0) * 28 +
            120,
        );
        discussionCount += score;
        if (now - post.createdAt.getTime() < 72 * 60 * 60 * 1000) {
          recentScore += score;
        }
      }

      return {
        id: topic.id,
        name: topic.name,
        discussionCount,
        isRising: recentScore > 0 && recentScore >= discussionCount * 0.45,
      };
    });

    const list = topicScores
      .filter((topic) => topic.discussionCount > 0)
      .sort((left, right) => right.discussionCount - left.discussionCount)
      .slice(0, 6);

    return { list };
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

  private async buildFollowGroups(followingIds: number[]) {
    if (followingIds.length === 0) {
      return [
        { id: 'all', name: '全部关注', count: 0, icon: 'A' },
        ...FOLLOW_GROUPS.map((group) => ({
          id: group.id,
          name: group.name,
          count: 0,
          icon: group.icon,
        })),
      ];
    }

    const creatorCategoryIndex = new Map<number, Set<string>>();
    const addCategoryCodes = (creatorId: number, codes: string[]) => {
      if (codes.length === 0) {
        return;
      }

      const categories = creatorCategoryIndex.get(creatorId) ?? new Set<string>();
      for (const code of codes) {
        categories.add(code);
      }
      creatorCategoryIndex.set(creatorId, categories);
    };

    const [videos, dynamicPosts] = await Promise.all([
      this.prisma.video.findMany({
        where: {
          creatorId: { in: followingIds },
          status: 'PUBLISHED',
        },
        select: {
          creatorId: true,
          category: true,
          categories: { select: { code: true } },
        },
      }),
      this.prisma.dynamicPost.findMany({
        where: {
          authorId: { in: followingIds },
          status: 'NORMAL',
        },
        select: {
          authorId: true,
          content: true,
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 240,
      }),
    ]);

    for (const video of videos) {
      addCategoryCodes(video.creatorId, [
        video.category,
        ...video.categories.map((category) => category.code),
      ]);
    }

    for (const post of dynamicPosts) {
      addCategoryCodes(post.authorId, this.inferDynamicPostCategoryCodes(post.content));
    }

    return [
      { id: 'all', name: '全部关注', count: followingIds.length, icon: 'A' },
      ...FOLLOW_GROUPS.map((group) => {
        const count = followingIds.filter((id) => {
          const categories = creatorCategoryIndex.get(id);
          return categories ? group.categoryCodes.some((code) => categories.has(code)) : false;
        }).length;

        return {
          id: group.id,
          name: group.name,
          count,
          icon: group.icon,
        };
      }),
    ];
  }

  private inferDynamicPostCategoryCodes(content: string) {
    const normalized = content.toLowerCase();
    const codes = new Set<string>();

    if (['学习', '知识', '英语', '考试', 'study'].some((keyword) => normalized.includes(keyword))) {
      codes.add('study');
    }
    if (
      ['编程', '科技', '技术', 'typescript', 'java', 'next', 'coding', 'tech'].some((keyword) =>
        normalized.includes(keyword),
      )
    ) {
      codes.add('tech');
    }
    if (['游戏', '实况', 'game'].some((keyword) => normalized.includes(keyword))) {
      codes.add('game');
    }
    if (['影视', '电影', '娱乐', 'media', 'film'].some((keyword) => normalized.includes(keyword))) {
      codes.add('film');
    }

    return Array.from(codes);
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

  private dynamicPostToFeedItem(
    post: DynamicPostItem,
    source: DynamicFeedSource,
  ): DynamicFeedItem {
    const hasText = post.content.trim().length > 0;
    const hasImages = post.images.length > 0;
    const type = hasImages && hasText ? 'image_text' : hasImages ? 'image' : 'text';

    return {
      id: post.id,
      type,
      source,
      author: post.author,
      actionText: source === 'following' ? this.dynamicPostActionText(type) : '推荐给你',
      title: post.content.slice(0, 40) || this.dynamicPostTitle(type),
      description: post.content,
      images: post.images,
      createdAt: post.createdAt,
      stats: {
        likes: post.likeCount,
        comments: post.commentCount,
        favorites: post.favoriteCount,
        liked: post.liked,
      },
      score: this.calculateDynamicScore({
        createdAt: post.createdAt,
        likes: post.likeCount,
        comments: post.commentCount,
        favorites: post.favoriteCount,
        source,
        recommendationScore: source === 'following' ? 0.9 : 0.7,
      }),
    };
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

    if (type === 'post') {
      return items.filter((item) => ['image_text', 'text', 'image'].includes(item.type));
    }

    return items.filter((item) => item.type === type);
  }

  private dynamicPostActionText(type: DynamicFeedItem['type']) {
    if (type === 'image_text') return '发布了图文动态';
    if (type === 'image') return '发布了图片动态';
    if (type === 'text') return '发布了文字动态';
    return '发布了动态';
  }

  private dynamicPostTitle(type: DynamicFeedItem['type']) {
    if (type === 'image_text') return '图文动态';
    if (type === 'image') return '图片动态';
    if (type === 'text') return '文字动态';
    return '动态';
  }

  private async attachInteractionState(items: DynamicFeedItem[], currentUserId?: number) {
    if (!currentUserId) {
      return items;
    }

    const videoIds = items
      .map((item) => (item.type === 'video' ? this.extractNumericId(item.id, 'video-') : null))
      .filter((id): id is number => typeof id === 'number');

    if (videoIds.length === 0) {
      return items;
    }

    const [likedVideos, favoritedVideos] = await Promise.all([
      this.prisma.videoLike.findMany({
        where: {
          userId: currentUserId,
          videoId: { in: videoIds },
        },
        select: { videoId: true },
      }),
      this.prisma.favorite.findMany({
        where: {
          userId: currentUserId,
          videoId: { in: videoIds },
        },
        select: { videoId: true },
      }),
    ]);
    const likedVideoIds = new Set(likedVideos.map((item) => item.videoId));
    const favoritedVideoIds = new Set(favoritedVideos.map((item) => item.videoId));

    return items.map((item) => {
      if (item.type !== 'video') {
        return item;
      }

      const videoId = this.extractNumericId(item.id, 'video-');
      return {
        ...item,
        stats: {
          ...item.stats,
          liked: videoId ? likedVideoIds.has(videoId) : false,
          favorited: videoId ? favoritedVideoIds.has(videoId) : false,
        },
      };
    });
  }

  private extractNumericId(value: string, prefix: string) {
    if (!value.startsWith(prefix)) {
      return null;
    }

    const id = Number(value.slice(prefix.length));
    return Number.isInteger(id) && id > 0 ? id : null;
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

  private resolveVideoTime(video: { publishedAt?: Date | null; createdAt?: Date | null }) {
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
    return type && ['all', 'video', 'post', 'image_text', 'text', 'image', 'live'].includes(type) ? type : 'all';
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
