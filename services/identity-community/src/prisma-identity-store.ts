import { randomUUID } from 'node:crypto';

import {
  Prisma,
  PrismaClient,
  type DirectMessage as PrismaDirectMessage,
  type Notification as PrismaNotification,
  type User as PrismaUser,
} from '@prisma/client';

import {
  IdentityStoreError,
  type CreatorViewerTendency,
  type DirectMessagePermissionSnapshot,
  type DirectMessagePrivacy,
  type DirectMessageSnapshot,
  type DynamicPostCommentSnapshot,
  type DynamicPostSnapshot,
  type NotificationSnapshot,
  type NotificationType,
  type PublicUserSnapshot,
  type UserHomepageSnapshot,
  type UserRecommendationProfileSnapshot,
} from './identity-store.js';

type NotificationWithActor = PrismaNotification & {
  actor: Pick<PrismaUser, 'id' | 'nickname'> | null;
};

type MessageWithSender = PrismaDirectMessage & {
  sender: Pick<PrismaUser, 'id' | 'nickname' | 'avatarUrl'>;
};

const USER_SELECT = {
  id: true,
  username: true,
  email: true,
  password: true,
  role: true,
  nickname: true,
  phone: true,
  avatarUrl: true,
  bio: true,
  messagePrivacy: true,
  sessionNonce: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export class PrismaIdentityStore {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly adminSecret: string,
  ) {
    if (!adminSecret.trim()) {
      throw new IdentityStoreError(503, 'Admin secret is not configured');
    }
  }

  async register(payload: { username: string; password: string; nickname?: string; email?: string }) {
    const username = this.normalizeUsername(payload.username);
    const password = this.normalizePassword(payload.password);
    const nickname = this.normalizeNickname(payload.nickname ?? username);
    const email = this.normalizeEmail(payload.email ?? this.buildRegistrationEmail(username));

    try {
      const user = await this.prisma.user.create({
        data: {
          username,
          password,
          nickname,
          email,
          role: 'USER',
          messagePrivacy: 'ALLOW_ALL',
          profileSummary: { create: {} },
        },
        select: USER_SELECT,
      });
      return this.toRegisterResponse(user);
    } catch (error) {
      if (this.isKnownError(error, 'P2002')) {
        throw new IdentityStoreError(409, 'Username or email already exists');
      }
      throw error;
    }
  }

  async login(account?: string, password?: string, adminSecret?: string) {
    if (adminSecret && !account && !password) {
      return this.loginWithAdminSecret(adminSecret);
    }
    if (!account || !password) {
      throw new IdentityStoreError(401, 'Account and password are required');
    }
    const user = await this.findUserByAccount(account);
    if (!user || user.password !== password) {
      throw new IdentityStoreError(401, 'Invalid username/email or password');
    }
    if (user.role === 'ADMIN' && (!adminSecret || adminSecret !== this.adminSecret)) {
      throw new IdentityStoreError(401, 'Admin secret is invalid');
    }
    return this.issueSession(user);
  }

  async getCurrentUser(authHeader?: string | string[]) {
    const user = await this.findSessionUser(authHeader);
    return user ? this.toPublicUserSnapshot(user) : null;
  }

  async getCurrentAuthenticatedUser(authHeader?: string | string[]) {
    const user = await this.findSessionUser(authHeader);
    return user ? this.toAuthenticatedUser(user) : null;
  }

  async requireUser(authHeader?: string | string[]) {
    const user = await this.getCurrentUser(authHeader);
    if (!user) {
      throw new IdentityStoreError(401, 'Login required');
    }
    return user;
  }

  async updateProfile(
    userId: number,
    payload: {
      nickname?: string;
      avatarUrl?: string;
      bio?: string;
      email?: string;
      messagePrivacy?: DirectMessagePrivacy;
    },
  ) {
    const data: Prisma.UserUpdateInput = {};
    if (payload.email !== undefined) data.email = this.normalizeEmail(payload.email);
    if (payload.nickname !== undefined) data.nickname = this.normalizeNickname(payload.nickname);
    if (payload.avatarUrl !== undefined) data.avatarUrl = payload.avatarUrl.trim() || null;
    if (payload.bio !== undefined) data.bio = payload.bio.trim() || null;
    if (payload.messagePrivacy !== undefined) {
      if (!['ALLOW_ALL', 'FOLLOWING_ONLY', 'DISABLED'].includes(payload.messagePrivacy)) {
        throw new IdentityStoreError(400, 'Message privacy is invalid');
      }
      data.messagePrivacy = payload.messagePrivacy;
    }

    try {
      const user = await this.prisma.user.update({ where: { id: userId }, data, select: USER_SELECT });
      await this.refreshProfileSummary(userId);
      return this.toAuthenticatedUser(user);
    } catch (error) {
      if (this.isKnownError(error, 'P2002')) throw new IdentityStoreError(409, 'Email already exists');
      if (this.isKnownError(error, 'P2025')) throw new IdentityStoreError(404, 'User not found');
      throw error;
    }
  }

  async getHomepage(userId: number, currentUserId?: number): Promise<UserHomepageSnapshot> {
    const user = await this.requireUserById(userId);
    const [followers, following, isFollowing] = await Promise.all([
      this.getFollowerCount(userId),
      this.getFollowingCount(userId),
      currentUserId ? this.isFollowing(userId, currentUserId) : false,
    ]);
    return {
      id: user.id,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      messagePrivacy: user.messagePrivacy,
      followers,
      following,
      videos: 0,
      isFollowing,
      items: [],
    };
  }

  async getRecommendationProfile(userId: number) {
    await this.requireUserById(userId);
    return this.buildRecommendationProfile(userId);
  }

  async rebuildRecommendationProfile(userId: number) {
    await this.requireUserById(userId);
    await this.refreshProfileSummary(userId);
    return this.buildRecommendationProfile(userId);
  }

  async follow(targetUserId: number, currentUserId: number) {
    if (targetUserId === currentUserId) throw new IdentityStoreError(400, 'Cannot follow yourself');
    const [targetUser, currentUser] = await Promise.all([
      this.requireUserById(targetUserId),
      this.requireUserById(currentUserId),
    ]);
    try {
      await this.prisma.$transaction(async (transaction) => {
        await transaction.followRelation.create({ data: { followerId: currentUserId, followingId: targetUserId } });
        await transaction.notification.create({
          data: {
            recipientId: targetUserId,
            actorId: currentUserId,
            type: 'FOLLOW',
            title: '收到新的关注',
            content: `${currentUser.nickname} 关注了你`,
            relatedType: 'USER',
            relatedId: currentUserId,
          },
        });
        const followerCount = await transaction.followRelation.count({ where: { followingId: targetUserId } });
        await transaction.creatorFollowerDaily.upsert({
          where: { creatorId_statDate: { creatorId: targetUserId, statDate: this.today() } },
          update: { followerCount },
          create: { creatorId: targetUserId, statDate: this.today(), followerCount },
        });
      });
      await Promise.all([this.refreshProfileSummary(targetUser.id), this.refreshProfileSummary(currentUser.id)]);
    } catch (error) {
      if (!this.isKnownError(error, 'P2002')) throw error;
    }
    return { id: targetUserId, followed: true, followerCount: await this.getFollowerCount(targetUserId) };
  }

  async unfollow(targetUserId: number, currentUserId: number) {
    await Promise.all([this.requireUserById(targetUserId), this.requireUserById(currentUserId)]);
    await this.prisma.$transaction(async (transaction) => {
      await transaction.followRelation.deleteMany({ where: { followerId: currentUserId, followingId: targetUserId } });
      const followerCount = await transaction.followRelation.count({ where: { followingId: targetUserId } });
      await transaction.creatorFollowerDaily.upsert({
        where: { creatorId_statDate: { creatorId: targetUserId, statDate: this.today() } },
        update: { followerCount },
        create: { creatorId: targetUserId, statDate: this.today(), followerCount },
      });
    });
    await Promise.all([this.refreshProfileSummary(targetUserId), this.refreshProfileSummary(currentUserId)]);
    return { id: targetUserId, followed: false, followerCount: await this.getFollowerCount(targetUserId) };
  }

  async isFollowing(targetUserId: number, currentUserId?: number) {
    if (!currentUserId) return false;
    return Boolean(await this.prisma.followRelation.findUnique({
      where: { followerId_followingId: { followerId: currentUserId, followingId: targetUserId } },
      select: { id: true },
    }));
  }

  async getFollowers(targetUserId: number) {
    await this.requireUserById(targetUserId);
    const relations = await this.prisma.followRelation.findMany({
      where: { followingId: targetUserId },
      orderBy: { createdAt: 'desc' },
      include: { follower: { select: { id: true, nickname: true, avatarUrl: true } } },
    });
    return relations.map(({ follower, createdAt }) => ({ ...follower, followedAt: createdAt.toISOString() }));
  }

  async getFollowing(targetUserId: number) {
    await this.requireUserById(targetUserId);
    const relations = await this.prisma.followRelation.findMany({
      where: { followerId: targetUserId },
      orderBy: { createdAt: 'desc' },
      include: { following: { select: { id: true, nickname: true, avatarUrl: true } } },
    });
    return relations.map(({ following, createdAt }) => ({ ...following, followedAt: createdAt.toISOString() }));
  }

  async listNotifications(userId: number) {
    await this.requireUserById(userId);
    const notifications = await this.prisma.notification.findMany({
      where: { recipientId: userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { actor: { select: { id: true, nickname: true } } },
    });
    return notifications.map((notification) => this.toNotificationSnapshot(notification));
  }

  async getUnreadNotificationCount(userId: number) {
    await this.requireUserById(userId);
    return this.prisma.notification.count({ where: { recipientId: userId, isRead: false } });
  }

  async markAllNotificationsRead(userId: number) {
    await this.requireUserById(userId);
    const result = await this.prisma.notification.updateMany({
      where: { recipientId: userId, isRead: false },
      data: { isRead: true },
    });
    return { success: true, updatedCount: result.count };
  }

  async markNotificationRead(userId: number, notificationId: number) {
    await this.requireUserById(userId);
    const result = await this.prisma.notification.updateMany({
      where: { id: notificationId, recipientId: userId },
      data: { isRead: true },
    });
    if (result.count === 0) throw new IdentityStoreError(404, 'Notification not found');
    return { success: true };
  }

  async createNotification(payload: {
    recipientId: number;
    actorId?: number | null;
    type: NotificationType;
    title: string;
    content: string;
    relatedType?: string | null;
    relatedId?: number | null;
    requestId?: string;
  }) {
    await this.requireUserById(payload.recipientId);
    if (payload.actorId !== undefined && payload.actorId !== null) await this.requireUserById(payload.actorId);
    const normalized = {
      recipientId: payload.recipientId,
      actorId: payload.actorId ?? null,
      type: payload.type,
      title: this.normalizeText(payload.title, 128, 'Notification title'),
      content: this.normalizeText(payload.content, 255, 'Notification content'),
      relatedType: payload.relatedType ?? null,
      relatedId: payload.relatedId ?? null,
      requestId: payload.requestId?.trim() || null,
    };

    if (normalized.requestId) {
      const existing = await this.findNotificationByRequestId(normalized.requestId);
      if (existing) return this.assertNotificationReplay(existing, normalized);
    }
    try {
      const notification = await this.prisma.notification.create({
        data: normalized,
        include: { actor: { select: { id: true, nickname: true } } },
      });
      return this.toNotificationSnapshot(notification);
    } catch (error) {
      if (!normalized.requestId || !this.isKnownError(error, 'P2002')) throw error;
      const winner = await this.findNotificationByRequestId(normalized.requestId);
      if (!winner) throw error;
      return this.assertNotificationReplay(winner, normalized);
    }
  }

  async listDirectMessageConversations(userId: number) {
    await this.requireUserById(userId);
    const messages = await this.prisma.directMessage.findMany({
      where: { OR: [{ senderId: userId }, { recipientId: userId }] },
      orderBy: { createdAt: 'desc' },
      include: {
        sender: { select: { id: true, nickname: true, avatarUrl: true } },
        recipient: { select: { id: true, nickname: true, avatarUrl: true, messagePrivacy: true } },
      },
    });
    const latestByPeer = new Map<number, (typeof messages)[number]>();
    for (const message of messages) {
      const peerId = message.senderId === userId ? message.recipientId : message.senderId;
      if (!latestByPeer.has(peerId)) latestByPeer.set(peerId, message);
    }
    const output = [];
    for (const [peerId, latest] of latestByPeer) {
      const peer = latest.senderId === peerId ? latest.sender : latest.recipient;
      const peerUser = await this.requireUserById(peerId);
      const permission = await this.resolveMessagePermission(userId, peerId, peerUser.messagePrivacy);
      output.push({
        user: { id: peer.id, nickname: peer.nickname, avatarUrl: peer.avatarUrl },
        unreadCount: messages.filter((message) => message.senderId === peerId && message.recipientId === userId && !message.isRead).length,
        lastMessage: { id: latest.id, content: latest.content, createdAt: latest.createdAt.toISOString(), senderId: latest.senderId },
        ...permission,
      });
    }
    return output;
  }

  async getDirectMessageConversation(userId: number, targetUserId: number) {
    await Promise.all([this.requireUserById(userId), this.requireUserById(targetUserId)]);
    const targetUser = await this.requireUserById(targetUserId);
    const permission = await this.resolveMessagePermission(userId, targetUserId, targetUser.messagePrivacy);
    await this.prisma.directMessage.updateMany({
      where: { senderId: targetUserId, recipientId: userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    const messages = await this.prisma.directMessage.findMany({
      where: {
        OR: [
          { senderId: userId, recipientId: targetUserId },
          { senderId: targetUserId, recipientId: userId },
        ],
      },
      orderBy: { createdAt: 'asc' },
      include: { sender: { select: { id: true, nickname: true, avatarUrl: true } } },
    });
    return {
      targetUser: {
        id: targetUser.id,
        nickname: targetUser.nickname,
        avatarUrl: targetUser.avatarUrl,
        messagePrivacy: targetUser.messagePrivacy,
      },
      messages: messages.map((message) => this.toDirectMessageSnapshot(message)),
      ...permission,
    };
  }

  async sendDirectMessage(userId: number, targetUserId: number, content: string) {
    const [sender, targetUser] = await Promise.all([this.requireUserById(userId), this.requireUserById(targetUserId)]);
    const permission = await this.resolveMessagePermission(userId, targetUserId, targetUser.messagePrivacy);
    if (!permission.canSend) throw new IdentityStoreError(400, permission.reason ?? 'Cannot send private message');
    const message = await this.prisma.directMessage.create({
      data: {
        senderId: userId,
        recipientId: targetUserId,
        content: this.normalizeText(content, 1000, 'Private message content'),
      },
      include: { sender: { select: { id: true, nickname: true, avatarUrl: true } } },
    });
    await Promise.all([this.refreshProfileSummary(sender.id), this.refreshProfileSummary(targetUser.id)]);
    return {
      message: this.toDirectMessageSnapshot(message),
      targetUser: { id: targetUser.id, nickname: targetUser.nickname, avatarUrl: targetUser.avatarUrl, messagePrivacy: targetUser.messagePrivacy },
      ...permission,
    };
  }

  async getUnreadDirectMessageCount(userId: number) {
    await this.requireUserById(userId);
    return this.prisma.directMessage.count({ where: { recipientId: userId, isRead: false } });
  }

  async markAllDirectMessagesRead(userId: number) {
    await this.requireUserById(userId);
    const result = await this.prisma.directMessage.updateMany({
      where: { recipientId: userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { success: true, updatedCount: result.count };
  }

  async createDynamicPost(authorId: number, content: string, images: string[] = []) {
    const author = await this.requireUserById(authorId);
    const post = await this.prisma.dynamicPost.create({
      data: {
        authorId,
        content: this.normalizeText(content, 1000, 'Dynamic post content'),
        imageUrls: images.map((value) => value.trim()).filter(Boolean),
      },
    });
    await this.refreshProfileSummary(author.id);
    return this.toDynamicPostSnapshot(post, author, false);
  }

  async listDynamicPosts(currentUserId?: number, authorIds?: number[]): Promise<DynamicPostSnapshot[]> {
    const posts = await this.prisma.dynamicPost.findMany({
      where: {
        status: 'NORMAL',
        ...(authorIds?.length ? { authorId: { in: authorIds } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, nickname: true, avatarUrl: true } },
        likes: currentUserId ? { where: { userId: currentUserId }, select: { id: true } } : false,
      },
    });
    return posts.map((post) => this.toDynamicPostSnapshot(post, post.author, Boolean(currentUserId && post.likes.length)));
  }

  async getDynamicFeed(options: { currentUserId?: number; type?: string; page?: number; pageSize?: number; authorId?: number }) {
    const type = options.type ?? 'all';
    const page = Math.max(1, Math.floor(options.page ?? 1));
    const pageSize = Math.max(1, Math.min(60, Math.floor(options.pageSize ?? 20)));
    const followingIds = options.currentUserId ? await this.getFollowingIds(options.currentUserId) : [];
    const followingSet = new Set(followingIds);
    const posts = await this.listDynamicPosts(options.currentUserId, options.authorId === undefined ? undefined : [options.authorId]);
    const items = posts
      .filter(() => type === 'all' || type === 'post')
      .map((post) => ({
        id: `dynamic-post-${post.id}`,
        type: 'post' as const,
        source: options.currentUserId && followingSet.has(post.authorId) ? 'following' : 'recommended',
        author: post.author,
        actionText: `${post.author.username} 发布了动态`,
        title: this.buildPostTitle(post.content),
        description: post.content,
        images: post.images,
        createdAt: post.createdAt,
        stats: { likes: post.likeCount, comments: post.commentCount, favorites: post.favoriteCount, liked: post.liked },
      }));
    const start = (page - 1) * pageSize;
    return {
      list: items.slice(start, start + pageSize),
      page,
      pageSize,
      hasMore: items.length > start + pageSize,
      meta: {
        isGuest: !options.currentUserId,
        followingCount: followingIds.length,
        followingItemCount: items.filter((item) => item.source === 'following').length,
        recommendedItemCount: items.filter((item) => item.source === 'recommended').length,
      },
    };
  }

  async getSidebarOverview(currentUserId?: number) {
    if (!currentUserId) {
      return {
        profileStats: { followingCount: 0, followerCount: 0, dynamicCount: 0 },
        groups: [
          { id: 'following', name: '关注', count: 0, icon: 'F' },
          { id: 'dynamic', name: '动态', count: 0, icon: 'D' },
          { id: 'messages', name: '私信', count: 0, icon: 'M' },
        ],
      };
    }
    const [followingCount, followerCount, dynamicCount, unreadMessages] = await Promise.all([
      this.getFollowingCount(currentUserId),
      this.getFollowerCount(currentUserId),
      this.prisma.dynamicPost.count({ where: { authorId: currentUserId, status: 'NORMAL' } }),
      this.getUnreadDirectMessageCount(currentUserId),
    ]);
    return {
      profileStats: { followingCount, followerCount, dynamicCount },
      groups: [
        { id: 'following', name: '关注', count: followingCount, icon: 'F' },
        { id: 'dynamic', name: '动态', count: dynamicCount, icon: 'D' },
        { id: 'messages', name: '私信', count: unreadMessages, icon: 'M' },
      ],
    };
  }

  async getRecommendedUsers(currentUserId?: number) {
    const followingIds = new Set(currentUserId ? await this.getFollowingIds(currentUserId) : []);
    const users = await this.prisma.user.findMany({
      where: { role: 'USER' },
      include: { _count: { select: { followerRelations: true } } },
    });
    return users
      .filter((user) => user.id !== currentUserId && !followingIds.has(user.id))
      .map((user) => ({
        userId: String(user.id),
        username: user.nickname,
        avatar: user.avatarUrl,
        bio: user.bio ?? undefined,
        followerCount: user._count.followerRelations,
        reason: '身份服务推荐',
        followed: false,
      }))
      .sort((left, right) => right.followerCount - left.followerCount)
      .slice(0, 8);
  }

  async getRecentUpdates(currentUserId?: number) {
    const followingIds = new Set(currentUserId ? await this.getFollowingIds(currentUserId) : []);
    const notifications = await this.prisma.notification.findMany({
      where: {
        type: 'FOLLOW',
        ...(currentUserId ? { actorId: { in: [...followingIds] } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: { actor: { select: { nickname: true, avatarUrl: true } } },
    });
    return notifications.map((notification) => ({
      userId: String(notification.actorId ?? notification.recipientId),
      username: notification.actor?.nickname ?? notification.title,
      avatar: notification.actor?.avatarUrl ?? null,
      lastActionText: notification.content,
      lastUpdateAt: notification.createdAt.toISOString(),
    }));
  }

  async likeDynamicPost(postId: number, userId: number) {
    await this.requireUserById(userId);
    try {
      await this.prisma.$transaction(async (transaction) => {
        const post = await transaction.dynamicPost.findFirst({ where: { id: postId, status: 'NORMAL' } });
        if (!post) throw new IdentityStoreError(404, 'Dynamic post not found');
        const user = await transaction.user.findUnique({ where: { id: userId }, select: { nickname: true } });
        if (!user) throw new IdentityStoreError(404, 'User not found');
        await transaction.dynamicPostLike.create({ data: { postId, userId } });
        await transaction.dynamicPost.update({ where: { id: postId }, data: { likeCount: { increment: 1 } } });
        if (post.authorId !== userId) {
          await transaction.notification.create({
            data: {
              recipientId: post.authorId,
              actorId: userId,
              type: 'LIKE',
              title: '收到新的点赞',
              content: `${user.nickname} 点赞了你的动态`,
              relatedType: 'DYNAMIC_POST',
              relatedId: postId,
            },
          });
        }
      });
      const post = await this.requireDynamicPost(postId);
      await Promise.all([this.refreshProfileSummary(userId), this.refreshProfileSummary(post.authorId)]);
      return { postId, liked: true, likeCount: post.likeCount };
    } catch (error) {
      if (!this.isKnownError(error, 'P2002')) throw error;
      const post = await this.requireDynamicPost(postId);
      return { postId, liked: true, likeCount: post.likeCount };
    }
  }

  async unlikeDynamicPost(postId: number, userId: number) {
    const post = await this.requireDynamicPost(postId);
    await this.requireUserById(userId);
    const deleted = await this.prisma.dynamicPostLike.deleteMany({ where: { postId, userId } });
    if (deleted.count > 0) {
      await this.prisma.dynamicPost.update({
        where: { id: postId },
        data: { likeCount: { decrement: Math.min(deleted.count, post.likeCount) } },
      });
      await Promise.all([this.refreshProfileSummary(userId), this.refreshProfileSummary(post.authorId)]);
    }
    const updated = await this.requireDynamicPost(postId);
    return { postId, liked: false, likeCount: updated.likeCount };
  }

  async listDynamicPostComments(postId: number) {
    await this.requireDynamicPost(postId);
    const comments = await this.prisma.dynamicPostComment.findMany({
      where: { postId, status: 'NORMAL' },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { id: true, nickname: true, avatarUrl: true } } },
    });
    return {
      postId,
      items: comments.map((comment) => ({
        id: comment.id,
        postId: comment.postId,
        content: comment.content,
        createdAt: comment.createdAt.toISOString(),
        user: comment.user,
      } satisfies DynamicPostCommentSnapshot)),
    };
  }

  async createDynamicPostComment(postId: number, userId: number, content: string) {
    const [post, user] = await Promise.all([this.requireDynamicPost(postId), this.requireUserById(userId)]);
    const comment = await this.prisma.$transaction(async (transaction) => {
      const created = await transaction.dynamicPostComment.create({
        data: { postId, userId, content: this.normalizeText(content, 1000, 'Comment content') },
        include: { user: { select: { id: true, nickname: true, avatarUrl: true } } },
      });
      await transaction.dynamicPost.update({ where: { id: postId }, data: { commentCount: { increment: 1 } } });
      if (post.authorId !== userId) {
        await transaction.notification.create({
          data: {
            recipientId: post.authorId,
            actorId: userId,
            type: 'COMMENT',
            title: '收到新的评论',
            content: `${user.nickname} 评论了你的动态：${created.content.slice(0, 80)}`,
            relatedType: 'DYNAMIC_POST',
            relatedId: postId,
          },
        });
      }
      return created;
    });
    await Promise.all([this.refreshProfileSummary(userId), this.refreshProfileSummary(post.authorId)]);
    return {
      id: comment.id,
      postId: comment.postId,
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
      user: comment.user,
    } satisfies DynamicPostCommentSnapshot;
  }

  async batchSummary(userIds: number[]) {
    const requestedIds = this.uniqueStable(userIds.map(Number).filter((value) => Number.isInteger(value) && value > 0));
    const users = await this.prisma.user.findMany({
      where: { id: { in: requestedIds } },
      select: { id: true, nickname: true, avatarUrl: true },
    });
    const usersById = new Map(users.map((user) => [user.id, user]));
    const items = requestedIds.flatMap((id) => usersById.has(id) ? [usersById.get(id)!] : []);
    const byId = Object.fromEntries(items.map((item) => [item.id, item]));
    const missingIds = requestedIds.filter((id) => !usersById.has(id));
    return { requestedIds, items, byId, missingIds };
  }

  async userExists(userId: number) {
    return Boolean(await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } }));
  }

  async getFollowerCount(userId: number) {
    return this.prisma.followRelation.count({ where: { followingId: userId } });
  }

  async getFollowingCount(userId: number) {
    return this.prisma.followRelation.count({ where: { followerId: userId } });
  }

  async getFollowingIds(userId?: number) {
    if (!userId) return [];
    const relations = await this.prisma.followRelation.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    return relations.map(({ followingId }) => followingId);
  }

  private async findUserByAccount(account: string) {
    const trimmed = account.trim();
    if (!trimmed) return null;
    return this.prisma.user.findFirst({
      where: trimmed.includes('@')
        ? { email: this.normalizeEmail(trimmed) }
        : { username: trimmed },
      select: USER_SELECT,
    });
  }

  private async findSessionUser(authHeader?: string | string[]) {
    const parsed = this.parseSessionToken(authHeader);
    if (!parsed) return null;
    return this.prisma.user.findFirst({
      where: { id: parsed.userId, sessionNonce: parsed.sessionNonce },
      select: USER_SELECT,
    });
  }

  private async issueSession(user: PrismaUser) {
    const sessionNonce = randomUUID();
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { sessionNonce },
      select: USER_SELECT,
    });
    return {
      token: `identity-token-${updated.id}-${sessionNonce}`,
      userId: updated.id,
      role: updated.role,
      nickname: updated.nickname,
      email: updated.email,
      bio: updated.bio,
    };
  }

  private async loginWithAdminSecret(adminSecret: string) {
    if (adminSecret !== this.adminSecret) throw new IdentityStoreError(401, 'Admin secret is invalid');
    const admin = await this.prisma.user.findFirst({ where: { role: 'ADMIN' }, select: USER_SELECT });
    if (!admin) throw new IdentityStoreError(503, 'Admin user is not available');
    return this.issueSession(admin);
  }

  private async resolveMessagePermission(
    senderId: number,
    recipientId: number,
    messagePrivacy: DirectMessagePrivacy,
  ): Promise<DirectMessagePermissionSnapshot> {
    const [senderFollowsRecipient, recipientFollowsSender] = await Promise.all([
      this.isFollowing(recipientId, senderId),
      this.isFollowing(senderId, recipientId),
    ]);
    if (senderId === recipientId) {
      return { canSend: false, messagePrivacy, senderFollowsRecipient: false, recipientFollowsSender: false, reason: 'Cannot send private message to yourself' };
    }
    if (messagePrivacy === 'DISABLED') {
      return { canSend: false, messagePrivacy, senderFollowsRecipient, recipientFollowsSender, reason: 'Recipient has disabled private messages' };
    }
    if (messagePrivacy === 'FOLLOWING_ONLY' && !recipientFollowsSender) {
      return { canSend: false, messagePrivacy, senderFollowsRecipient, recipientFollowsSender, reason: 'Recipient only accepts messages from followers' };
    }
    return { canSend: true, messagePrivacy, senderFollowsRecipient, recipientFollowsSender };
  }

  private async buildRecommendationProfile(userId: number): Promise<UserRecommendationProfileSnapshot> {
    const [summary, categoryPreferences, creatorPreferences] = await Promise.all([
      this.prisma.userProfileSummary.findUnique({ where: { userId } }),
      this.prisma.userCategoryPreference.findMany({ where: { userId }, orderBy: { score: 'desc' } }),
      this.prisma.userCreatorPreference.findMany({
        where: { userId },
        orderBy: { score: 'desc' },
        include: { creator: { select: { nickname: true } } },
      }),
    ]);
    const resolved = summary ?? await this.prisma.userProfileSummary.create({ data: { userId } });
    return {
      userId,
      summary: {
        activityScore: resolved.activityScore,
        activityLevel: resolved.activityLevel,
        behaviorSignalCount: resolved.behaviorSignalCount,
        viewerScore: resolved.viewerScore,
        creatorScore: resolved.creatorScore,
        creatorViewerTendency: resolved.creatorViewerTendency,
        isColdStart: resolved.isColdStart,
        updatedAt: resolved.updatedAt.toISOString(),
      },
      categoryPreferences: categoryPreferences.map((item) => ({
        categoryId: item.categoryId,
        categoryCode: String(item.categoryId),
        categoryLabel: String(item.categoryId),
        score: item.score,
      })),
      creatorPreferences: creatorPreferences.map((item) => ({
        creatorId: item.creatorId,
        creatorNickname: item.creator.nickname,
        score: item.score,
      })),
    };
  }

  private async refreshProfileSummary(userId: number) {
    const [followerCount, followingCount, postCount, messageCount] = await Promise.all([
      this.getFollowerCount(userId),
      this.getFollowingCount(userId),
      this.prisma.dynamicPost.count({ where: { authorId: userId, status: 'NORMAL' } }),
      this.prisma.directMessage.count({ where: { OR: [{ senderId: userId }, { recipientId: userId }] } }),
    ]);
    const behaviorSignalCount = followerCount + followingCount + postCount + messageCount;
    const activityScore = followerCount * 4 + followingCount * 2 + postCount * 5 + messageCount * 2;
    const viewerScore = followingCount * 2 + messageCount;
    const creatorScore = followerCount * 3 + postCount * 5;
    const activityLevel = activityScore >= 24 ? 'HIGH' : activityScore >= 10 ? 'MEDIUM' : 'LOW';
    const creatorViewerTendency: CreatorViewerTendency = behaviorSignalCount === 0
      ? 'COLD_START'
      : creatorScore > viewerScore * 1.2
        ? 'CREATOR'
        : viewerScore > creatorScore * 1.2
          ? 'VIEWER'
          : 'BALANCED';
    await this.prisma.userProfileSummary.upsert({
      where: { userId },
      update: { activityScore, activityLevel, behaviorSignalCount, viewerScore, creatorScore, creatorViewerTendency, isColdStart: behaviorSignalCount === 0 },
      create: { userId, activityScore, activityLevel, behaviorSignalCount, viewerScore, creatorScore, creatorViewerTendency, isColdStart: behaviorSignalCount === 0 },
    });
  }

  private async requireUserById(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: USER_SELECT });
    if (!user) throw new IdentityStoreError(404, 'User not found');
    return user;
  }

  private async requireDynamicPost(postId: number) {
    const post = await this.prisma.dynamicPost.findFirst({ where: { id: postId, status: 'NORMAL' } });
    if (!post) throw new IdentityStoreError(404, 'Dynamic post not found');
    return post;
  }

  private async findNotificationByRequestId(requestId: string) {
    return this.prisma.notification.findUnique({
      where: { requestId },
      include: { actor: { select: { id: true, nickname: true } } },
    });
  }

  private assertNotificationReplay(
    existing: NotificationWithActor,
    payload: {
      recipientId: number;
      actorId: number | null;
      type: NotificationType;
      title: string;
      content: string;
      relatedType: string | null;
      relatedId: number | null;
    },
  ) {
    const samePayload = existing.recipientId === payload.recipientId
      && existing.actorId === payload.actorId
      && existing.type === payload.type
      && existing.title === payload.title
      && existing.content === payload.content
      && existing.relatedType === payload.relatedType
      && existing.relatedId === payload.relatedId;
    if (!samePayload) throw new IdentityStoreError(409, 'Notification requestId conflicts with an existing payload');
    return this.toNotificationSnapshot(existing);
  }

  private toRegisterResponse(user: PrismaUser) {
    return { id: user.id, username: user.username, email: user.email, role: user.role, nickname: user.nickname };
  }

  private toAuthenticatedUser(user: PrismaUser) {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      messagePrivacy: user.messagePrivacy,
      role: user.role,
    };
  }

  private toPublicUserSnapshot(user: PrismaUser): PublicUserSnapshot {
    return {
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      role: user.role,
      messagePrivacy: user.messagePrivacy,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  private toNotificationSnapshot(notification: NotificationWithActor): NotificationSnapshot {
    return {
      id: notification.id,
      recipientId: notification.recipientId,
      actorId: notification.actorId,
      type: notification.type,
      title: notification.title,
      content: notification.content,
      relatedType: notification.relatedType,
      relatedId: notification.relatedId,
      isRead: notification.isRead,
      createdAt: notification.createdAt.toISOString(),
      updatedAt: notification.updatedAt.toISOString(),
      actor: notification.actor,
    };
  }

  private toDirectMessageSnapshot(message: MessageWithSender): DirectMessageSnapshot {
    return {
      id: message.id,
      senderId: message.senderId,
      recipientId: message.recipientId,
      content: message.content,
      isRead: message.isRead,
      readAt: message.readAt?.toISOString() ?? null,
      createdAt: message.createdAt.toISOString(),
      sender: message.sender,
    };
  }

  private toDynamicPostSnapshot(
    post: {
      id: number;
      authorId: number;
      content: string;
      imageUrls: Prisma.JsonValue | null;
      status: 'NORMAL' | 'HIDDEN' | 'DELETED';
      likeCount: number;
      commentCount: number;
      favoriteCount: number;
      createdAt: Date;
      updatedAt: Date;
    },
    author: Pick<PrismaUser, 'id' | 'nickname' | 'avatarUrl'>,
    liked: boolean,
  ): DynamicPostSnapshot {
    return {
      id: post.id,
      authorId: post.authorId,
      content: post.content,
      images: this.asStringArray(post.imageUrls),
      status: post.status,
      likeCount: post.likeCount,
      commentCount: post.commentCount,
      favoriteCount: post.favoriteCount,
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
      liked,
      author: { id: String(author.id), username: author.nickname, avatar: author.avatarUrl },
    };
  }

  private normalizeUsername(value: string) {
    const trimmed = value?.trim();
    if (!trimmed) throw new IdentityStoreError(400, 'Username is required');
    if (trimmed.length > 64) throw new IdentityStoreError(400, 'Username must not exceed 64 characters');
    return trimmed;
  }

  private normalizeNickname(value: string) {
    const trimmed = value?.trim();
    if (!trimmed) throw new IdentityStoreError(400, 'Nickname is required');
    return trimmed.slice(0, 64);
  }

  private normalizePassword(value: string) {
    const trimmed = value?.trim();
    if (!trimmed || trimmed.length < 6) throw new IdentityStoreError(400, 'Password must contain at least 6 characters');
    return trimmed;
  }

  private normalizeEmail(value: string) {
    const trimmed = value?.trim().toLowerCase();
    if (!trimmed?.includes('@')) throw new IdentityStoreError(400, 'Email is invalid');
    if (trimmed.length > 128) throw new IdentityStoreError(400, 'Email must not exceed 128 characters');
    return trimmed;
  }

  private normalizeText(value: string, maxLength: number, label: string) {
    const trimmed = value?.trim();
    if (!trimmed) throw new IdentityStoreError(400, `${label} is required`);
    if (trimmed.length > maxLength) throw new IdentityStoreError(400, `${label} must not exceed ${maxLength} characters`);
    return trimmed;
  }

  private buildRegistrationEmail(username: string) {
    return `user-${Buffer.from(username, 'utf8').toString('hex')}@local.invalid`;
  }

  private buildPostTitle(content: string) {
    return content.length <= 24 ? content : `${content.slice(0, 24)}...`;
  }

  private uniqueStable(values: number[]) {
    return [...new Set(values)];
  }

  private parseSessionToken(authHeader?: string | string[]) {
    const normalizedHeader = Array.isArray(authHeader) ? authHeader[0] : authHeader;
    const token = normalizedHeader?.replace(/^Bearer\s+/i, '').trim();
    const match = token ? /^(?:identity|mock)-token-(\d+)-(.+)$/.exec(token) : null;
    if (!match) return null;
    const userId = Number(match[1]);
    const sessionNonce = match[2] ?? '';
    return Number.isInteger(userId) && userId > 0 && sessionNonce ? { userId, sessionNonce } : null;
  }

  private asStringArray(value: Prisma.JsonValue | null) {
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  }

  private today() {
    return new Date().toISOString().slice(0, 10);
  }

  private isKnownError(error: unknown, code: string) {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;
  }
}
