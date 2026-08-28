import { randomUUID } from 'node:crypto';

export type UserRole = 'USER' | 'ADMIN';
export type DirectMessagePrivacy = 'ALLOW_ALL' | 'FOLLOWING_ONLY' | 'DISABLED';
export type NotificationType = 'COMMENT' | 'REPLY' | 'FOLLOW' | 'SYSTEM' | 'LIKE' | 'FAVORITE' | 'REPORT';
export type TextStatus = 'NORMAL' | 'HIDDEN' | 'DELETED';
export type CreatorViewerTendency = 'COLD_START' | 'VIEWER' | 'CREATOR' | 'BALANCED';

export interface UserRecord {
  id: number;
  username: string;
  email: string;
  password: string;
  role: UserRole;
  nickname: string;
  avatarUrl: string | null;
  bio: string | null;
  coinBalance: number;
  messagePrivacy: DirectMessagePrivacy;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicUserSnapshot {
  id: number;
  username: string;
  nickname: string;
  avatarUrl: string | null;
  bio: string | null;
  role: UserRole;
  messagePrivacy: DirectMessagePrivacy;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationSnapshot {
  id: number;
  recipientId: number;
  actorId: number | null;
  type: NotificationType;
  title: string;
  content: string;
  relatedType: string | null;
  relatedId: number | null;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
  actor: { id: number; nickname: string } | null;
}

export interface DirectMessageSnapshot {
  id: number;
  senderId: number;
  recipientId: number;
  content: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  sender: { id: number; nickname: string; avatarUrl: string | null };
}

export interface DynamicPostSnapshot {
  id: number;
  authorId: number;
  content: string;
  images: string[];
  status: TextStatus;
  likeCount: number;
  commentCount: number;
  favoriteCount: number;
  createdAt: string;
  updatedAt: string;
  liked: boolean;
  author: { id: string; username: string; avatar: string | null };
}

export interface DynamicPostCommentSnapshot {
  id: number;
  postId: number;
  content: string;
  createdAt: string;
  user: { id: number; nickname: string; avatarUrl: string | null };
}

export interface UserHomepageSnapshot {
  id: number;
  nickname: string;
  avatarUrl: string | null;
  bio: string | null;
  messagePrivacy: DirectMessagePrivacy;
  followers: number;
  following: number;
  videos: number;
  isFollowing: boolean;
  coinBalance?: number;
  items: Array<Record<string, never>>;
}

export interface UserRecommendationProfileSnapshot {
  userId: number;
  summary: {
    activityScore: number;
    activityLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    behaviorSignalCount: number;
    viewerScore: number;
    creatorScore: number;
    creatorViewerTendency: CreatorViewerTendency;
    isColdStart: boolean;
    updatedAt: string;
  };
  categoryPreferences: Array<{ categoryId: number; categoryCode: string; categoryLabel: string; score: number }>;
  creatorPreferences: Array<{ creatorId: number; creatorNickname: string; score: number }>;
}

export interface DirectMessagePermissionSnapshot {
  canSend: boolean;
  messagePrivacy: DirectMessagePrivacy;
  senderFollowsRecipient: boolean;
  recipientFollowsSender: boolean;
  reason?: string;
}

interface FollowRelationRecord {
  id: number;
  followerId: number;
  followingId: number;
  createdAt: Date;
}

interface DynamicPostRecord {
  id: number;
  authorId: number;
  content: string;
  images: string[];
  status: TextStatus;
  likeCount: number;
  commentCount: number;
  favoriteCount: number;
  createdAt: Date;
  updatedAt: Date;
}

interface DynamicPostLikeRecord {
  id: number;
  postId: number;
  userId: number;
  createdAt: Date;
}

interface DynamicPostCommentRecord {
  id: number;
  postId: number;
  userId: number;
  content: string;
  status: TextStatus;
  createdAt: Date;
  updatedAt: Date;
}

interface DirectMessageRecord {
  id: number;
  senderId: number;
  recipientId: number;
  content: string;
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface NotificationRecord {
  id: number;
  recipientId: number;
  actorId: number | null;
  type: NotificationType;
  title: string;
  content: string;
  relatedType: string | null;
  relatedId: number | null;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface ProfileSummaryRecord {
  activityScore: number;
  activityLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  behaviorSignalCount: number;
  viewerScore: number;
  creatorScore: number;
  creatorViewerTendency: CreatorViewerTendency;
  isColdStart: boolean;
  updatedAt: Date;
}

const DEFAULT_ADMIN_SECRET = '123456';

export class IdentityStoreError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'IdentityStoreError';
  }
}

export class IdentityStore {
  private nextUserId = 1;
  private nextFollowId = 1;
  private nextNotificationId = 1;
  private nextMessageId = 1;
  private nextPostId = 1;
  private nextLikeId = 1;
  private nextCommentId = 1;

  private readonly users = new Map<number, UserRecord>();
  private readonly usersByUsername = new Map<string, number>();
  private readonly usersByEmail = new Map<string, number>();
  private readonly followRelations = new Map<string, FollowRelationRecord>();
  private readonly notifications = new Map<number, NotificationRecord>();
  private readonly notificationsByRequestId = new Map<string, number>();
  private readonly directMessages = new Map<number, DirectMessageRecord>();
  private readonly dynamicPosts = new Map<number, DynamicPostRecord>();
  private readonly dynamicPostLikes = new Map<string, DynamicPostLikeRecord>();
  private readonly dynamicPostComments = new Map<number, DynamicPostCommentRecord[]>();
  private readonly activeSessionNonceByUserId = new Map<number, string>();
  private readonly profileSummaries = new Map<number, ProfileSummaryRecord>();

  constructor(seedFixture = true) {
    if (seedFixture) {
      this.seed();
    }
  }

  reset(seedFixture = true) {
    this.nextUserId = 1;
    this.nextFollowId = 1;
    this.nextNotificationId = 1;
    this.nextMessageId = 1;
    this.nextPostId = 1;
    this.nextLikeId = 1;
    this.nextCommentId = 1;
    this.users.clear();
    this.usersByUsername.clear();
    this.usersByEmail.clear();
    this.followRelations.clear();
    this.notifications.clear();
    this.notificationsByRequestId.clear();
    this.directMessages.clear();
    this.dynamicPosts.clear();
    this.dynamicPostLikes.clear();
    this.dynamicPostComments.clear();
    this.activeSessionNonceByUserId.clear();
    this.profileSummaries.clear();
    if (seedFixture) {
      this.seed();
    }
  }

  register(payload: { username: string; password: string; nickname?: string; email?: string }) {
    const username = this.normalizeUsername(payload.username);
    const password = this.normalizePassword(payload.password);
    const nickname = this.normalizeNickname(payload.nickname ?? username);
    const email = this.normalizeEmail(payload.email ?? this.buildRegistrationEmail(username));
    this.assertUserAvailability(username, email);
    const user = this.createUser({ username, password, nickname, email, role: 'USER', messagePrivacy: 'ALLOW_ALL' });
    return this.toRegisterResponse(user);
  }

  login(account?: string, password?: string, adminSecret?: string) {
    if (adminSecret && !account && !password) {
      return this.loginWithAdminSecret(adminSecret);
    }
    if (!account || !password) {
      throw new IdentityStoreError(401, 'Account and password are required');
    }
    const user = this.findUserByAccount(account);
    if (!user || user.password !== password) {
      throw new IdentityStoreError(401, 'Invalid username/email or password');
    }
    if (user.role === 'ADMIN' && adminSecret && adminSecret !== DEFAULT_ADMIN_SECRET) {
      throw new IdentityStoreError(401, 'Admin secret is invalid');
    }
    return this.issueSession(user);
  }

  getCurrentUser(authHeader?: string | string[]) {
    const normalizedHeader = Array.isArray(authHeader) ? authHeader[0] : authHeader;
    const parsed = this.parseSessionToken(normalizedHeader);
    if (!parsed) {
      return null;
    }
    const activeSessionNonce = this.activeSessionNonceByUserId.get(parsed.userId);
    if (activeSessionNonce && activeSessionNonce !== parsed.sessionNonce) {
      return null;
    }
    const user = this.users.get(parsed.userId);
    return user ? this.toPublicUserSnapshot(user) : null;
  }

  requireUser(authHeader?: string | string[]) {
    const user = this.getCurrentUser(authHeader);
    if (!user) {
      throw new IdentityStoreError(401, 'Login required');
    }
    return user;
  }

  updateProfile(
    userId: number,
    payload: {
      nickname?: string;
      avatarUrl?: string;
      bio?: string;
      email?: string;
      messagePrivacy?: DirectMessagePrivacy;
    },
  ) {
    const user = this.assertUserExists(userId);
    if (payload.email !== undefined) {
      const normalizedEmail = this.normalizeEmail(payload.email);
      const existing = this.usersByEmail.get(normalizedEmail);
      if (existing !== undefined && existing !== userId) {
        throw new IdentityStoreError(409, 'Email already exists');
      }
      this.usersByEmail.delete(user.email);
      user.email = normalizedEmail;
      this.usersByEmail.set(user.email, user.id);
    }
    if (payload.nickname !== undefined) {
      user.nickname = this.normalizeNickname(payload.nickname);
    }
    if (payload.avatarUrl !== undefined) {
      user.avatarUrl = payload.avatarUrl.trim() ? payload.avatarUrl.trim() : null;
    }
    if (payload.bio !== undefined) {
      user.bio = payload.bio.trim() ? payload.bio.trim() : null;
    }
    if (payload.messagePrivacy !== undefined) {
      user.messagePrivacy = payload.messagePrivacy;
    }
    user.updatedAt = new Date();
    this.refreshProfileSummary(user.id);
    return this.toAuthenticatedUser(user);
  }

  getHomepage(userId: number, currentUserId?: number): UserHomepageSnapshot {
    const user = this.assertUserExists(userId);
    return {
      id: user.id,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      messagePrivacy: user.messagePrivacy,
      followers: this.getFollowerCount(user.id),
      following: this.getFollowingCount(user.id),
      videos: 0,
      isFollowing: currentUserId ? this.isFollowing(user.id, currentUserId) : false,
      coinBalance: currentUserId === user.id ? user.coinBalance : undefined,
      items: [],
    };
  }

  getRecommendationProfile(userId: number) {
    this.assertUserExists(userId);
    return this.buildRecommendationProfile(userId);
  }

  rebuildRecommendationProfile(userId: number) {
    this.assertUserExists(userId);
    this.refreshProfileSummary(userId);
    return this.buildRecommendationProfile(userId);
  }

  follow(targetUserId: number, currentUserId: number) {
    if (targetUserId === currentUserId) {
      throw new IdentityStoreError(400, 'Cannot follow yourself');
    }
    const targetUser = this.assertUserExists(targetUserId);
    const currentUser = this.assertUserExists(currentUserId);
    const key = this.followKey(currentUserId, targetUserId);
    if (!this.followRelations.has(key)) {
      this.followRelations.set(key, {
        id: this.nextFollowId++,
        followerId: currentUserId,
        followingId: targetUserId,
        createdAt: new Date(),
      });
      this.createNotification({
        recipientId: targetUser.id,
        actorId: currentUser.id,
        type: 'FOLLOW',
        title: '收到新的关注',
        content: `${currentUser.nickname} 关注了你`,
        relatedType: 'USER',
        relatedId: currentUser.id,
      });
      this.syncDailyFollowerSnapshot(targetUser.id);
      this.refreshProfileSummary(targetUser.id);
      this.refreshProfileSummary(currentUser.id);
    }
    return { id: targetUserId, followed: true, followerCount: this.getFollowerCount(targetUserId) };
  }

  unfollow(targetUserId: number, currentUserId: number) {
    this.assertUserExists(targetUserId);
    this.assertUserExists(currentUserId);
    this.followRelations.delete(this.followKey(currentUserId, targetUserId));
    this.syncDailyFollowerSnapshot(targetUserId);
    this.refreshProfileSummary(targetUserId);
    this.refreshProfileSummary(currentUserId);
    return { id: targetUserId, followed: false, followerCount: this.getFollowerCount(targetUserId) };
  }

  isFollowing(targetUserId: number, currentUserId?: number) {
    if (!currentUserId) {
      return false;
    }
    return this.followRelations.has(this.followKey(currentUserId, targetUserId));
  }

  getFollowers(targetUserId: number) {
    this.assertUserExists(targetUserId);
    return [...this.followRelations.values()]
      .filter((relation) => relation.followingId === targetUserId)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .map((relation) => {
        const follower = this.assertUserExists(relation.followerId);
        return { id: follower.id, nickname: follower.nickname, avatarUrl: follower.avatarUrl, followedAt: relation.createdAt.toISOString() };
      });
  }

  getFollowing(targetUserId: number) {
    this.assertUserExists(targetUserId);
    return [...this.followRelations.values()]
      .filter((relation) => relation.followerId === targetUserId)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .map((relation) => {
        const following = this.assertUserExists(relation.followingId);
        return { id: following.id, nickname: following.nickname, avatarUrl: following.avatarUrl, followedAt: relation.createdAt.toISOString() };
      });
  }

  listNotifications(userId: number) {
    this.assertUserExists(userId);
    return [...this.notifications.values()]
      .filter((notification) => notification.recipientId === userId)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .slice(0, 50)
      .map((notification) => this.toNotificationSnapshot(notification));
  }

  getUnreadNotificationCount(userId: number) {
    this.assertUserExists(userId);
    return [...this.notifications.values()].filter((notification) => notification.recipientId === userId && !notification.isRead).length;
  }

  markAllNotificationsRead(userId: number) {
    this.assertUserExists(userId);
    let updatedCount = 0;
    for (const notification of this.notifications.values()) {
      if (notification.recipientId === userId && !notification.isRead) {
        notification.isRead = true;
        notification.updatedAt = new Date();
        updatedCount += 1;
      }
    }
    return { success: true, updatedCount };
  }

  markNotificationRead(userId: number, notificationId: number) {
    this.assertUserExists(userId);
    const notification = this.notifications.get(notificationId);
    if (!notification || notification.recipientId !== userId) {
      throw new IdentityStoreError(404, 'Notification not found');
    }
    if (!notification.isRead) {
      notification.isRead = true;
      notification.updatedAt = new Date();
    }
    return { success: true };
  }

  createNotification(payload: {
    recipientId: number;
    actorId?: number | null;
    type: NotificationType;
    title: string;
    content: string;
    relatedType?: string | null;
    relatedId?: number | null;
    requestId?: string;
  }) {
    this.assertUserExists(payload.recipientId);
    if (payload.actorId !== undefined && payload.actorId !== null) {
      this.assertUserExists(payload.actorId);
    }
    if (payload.requestId) {
      const existingId = this.notificationsByRequestId.get(payload.requestId);
      if (existingId !== undefined) {
        return this.toNotificationSnapshot(this.assertNotificationExists(existingId));
      }
    }
    const notification: NotificationRecord = {
      id: this.nextNotificationId++,
      recipientId: payload.recipientId,
      actorId: payload.actorId ?? null,
      type: payload.type,
      title: payload.title,
      content: payload.content,
      relatedType: payload.relatedType ?? null,
      relatedId: payload.relatedId ?? null,
      isRead: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.notifications.set(notification.id, notification);
    if (payload.requestId) {
      this.notificationsByRequestId.set(payload.requestId, notification.id);
    }
    return this.toNotificationSnapshot(notification);
  }

  listDirectMessageConversations(userId: number) {
    this.assertUserExists(userId);
    const messages = this.listMessagesForUser(userId);
    const latestByPeer = new Map<number, DirectMessageRecord>();
    for (const message of messages) {
      const peerId = message.senderId === userId ? message.recipientId : message.senderId;
      if (!latestByPeer.has(peerId)) {
        latestByPeer.set(peerId, message);
      }
    }
    return [...latestByPeer.entries()].map(([peerId, latest]) => {
      const peer = this.assertUserExists(peerId);
      const permission = this.resolveMessagePermission(userId, peerId, peer.messagePrivacy);
      return {
        user: { id: peer.id, nickname: peer.nickname, avatarUrl: peer.avatarUrl },
        unreadCount: messages.filter((message) => message.senderId === peerId && message.recipientId === userId && !message.isRead).length,
        lastMessage: { id: latest.id, content: latest.content, createdAt: latest.createdAt.toISOString(), senderId: latest.senderId },
        ...permission,
      };
    });
  }

  getDirectMessageConversation(userId: number, targetUserId: number) {
    this.assertUserExists(userId);
    const targetUser = this.assertUserExists(targetUserId);
    const permission = this.resolveMessagePermission(userId, targetUserId, targetUser.messagePrivacy);
    for (const message of this.directMessages.values()) {
      if (message.senderId === targetUserId && message.recipientId === userId && !message.isRead) {
        message.isRead = true;
        message.readAt = new Date();
        message.updatedAt = new Date();
      }
    }
    const messages = this.listMessagesForUser(userId)
      .filter((message) =>
        (message.senderId === userId && message.recipientId === targetUserId)
        || (message.senderId === targetUserId && message.recipientId === userId),
      )
      .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
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

  sendDirectMessage(userId: number, targetUserId: number, content: string) {
    const sender = this.assertUserExists(userId);
    const targetUser = this.assertUserExists(targetUserId);
    const permission = this.resolveMessagePermission(userId, targetUserId, targetUser.messagePrivacy);
    if (!permission.canSend) {
      throw new IdentityStoreError(400, permission.reason ?? 'Cannot send private message');
    }
    const message: DirectMessageRecord = {
      id: this.nextMessageId++,
      senderId: sender.id,
      recipientId: targetUser.id,
      content: this.normalizeText(content, 1000, 'Private message content'),
      isRead: false,
      readAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.directMessages.set(message.id, message);
    this.refreshProfileSummary(sender.id);
    this.refreshProfileSummary(targetUser.id);
    return {
      message: this.toDirectMessageSnapshot(message),
      targetUser: { id: targetUser.id, nickname: targetUser.nickname, avatarUrl: targetUser.avatarUrl, messagePrivacy: targetUser.messagePrivacy },
      ...permission,
    };
  }

  getUnreadDirectMessageCount(userId: number) {
    this.assertUserExists(userId);
    return this.listMessagesForUser(userId).filter((message) => message.recipientId === userId && !message.isRead).length;
  }

  markAllDirectMessagesRead(userId: number) {
    this.assertUserExists(userId);
    let updatedCount = 0;
    for (const message of this.directMessages.values()) {
      if (message.recipientId === userId && !message.isRead) {
        message.isRead = true;
        message.readAt = new Date();
        message.updatedAt = new Date();
        updatedCount += 1;
      }
    }
    return { success: true, updatedCount };
  }

  createDynamicPost(authorId: number, content: string, images: string[] = []) {
    const author = this.assertUserExists(authorId);
    const post: DynamicPostRecord = {
      id: this.nextPostId++,
      authorId: author.id,
      content: this.normalizeText(content, 1000, 'Dynamic post content'),
      images: images.map((value) => value.trim()).filter(Boolean),
      status: 'NORMAL',
      likeCount: 0,
      commentCount: 0,
      favoriteCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.dynamicPosts.set(post.id, post);
    this.refreshProfileSummary(author.id);
    return this.toDynamicPostSnapshot(post, false);
  }

  listDynamicPosts(currentUserId?: number, authorIds?: number[]) {
    const authorFilter = authorIds && authorIds.length > 0 ? new Set(authorIds) : null;
    const likedPostIds = currentUserId
      ? new Set([...this.dynamicPostLikes.values()].filter((like) => like.userId === currentUserId).map((like) => like.postId))
      : new Set<number>();
    return [...this.dynamicPosts.values()]
      .filter((post) => post.status === 'NORMAL')
      .filter((post) => !authorFilter || authorFilter.has(post.authorId))
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .map((post) => this.toDynamicPostSnapshot(post, likedPostIds.has(post.id)));
  }

  getDynamicFeed(options: { currentUserId?: number; type?: string; page?: number; pageSize?: number; authorId?: number }) {
    const currentUserId = options.currentUserId;
    const type = options.type ?? 'all';
    const page = Math.max(1, Math.floor(options.page ?? 1));
    const pageSize = Math.max(1, Math.min(60, Math.floor(options.pageSize ?? 20)));
    const followingIds = currentUserId ? this.getFollowingIds(currentUserId) : [];
    const followingSet = new Set(followingIds);
    const posts = this.listDynamicPosts(currentUserId, options.authorId !== undefined ? [options.authorId] : undefined);
    const items = posts
      .filter(() => type === 'all' || type === 'post')
      .map((post) => ({
        id: `dynamic-post-${post.id}`,
        type: 'post' as const,
        source: currentUserId && followingSet.has(post.authorId) ? 'following' : 'recommended',
        author: post.author,
        actionText: `${post.author.username} 发布了动态`,
        title: this.buildPostTitle(post.content),
        description: post.content,
        images: post.images,
        createdAt: post.createdAt,
        stats: {
          likes: post.likeCount,
          comments: post.commentCount,
          favorites: post.favoriteCount,
          liked: post.liked,
        },
      }));
    const pageStart = (page - 1) * pageSize;
    const pageItems = items.slice(pageStart, pageStart + pageSize);
    return {
      list: pageItems,
      page,
      pageSize,
      hasMore: items.length > pageStart + pageSize,
      meta: {
        isGuest: !currentUserId,
        followingCount: followingIds.length,
        followingItemCount: items.filter((item) => item.source === 'following').length,
        recommendedItemCount: items.filter((item) => item.source === 'recommended').length,
      },
    };
  }

  getSidebarOverview(currentUserId?: number) {
    const followingIds = currentUserId ? this.getFollowingIds(currentUserId) : [];
    return {
      profileStats: {
        followingCount: followingIds.length,
        followerCount: currentUserId ? this.getFollowerCount(currentUserId) : 0,
        dynamicCount: currentUserId ? [...this.dynamicPosts.values()].filter((post) => post.authorId === currentUserId).length : 0,
      },
      groups: [
        { id: 'following', name: '关注', count: followingIds.length, icon: 'F' },
        { id: 'dynamic', name: '动态', count: currentUserId ? [...this.dynamicPosts.values()].filter((post) => post.authorId === currentUserId).length : 0, icon: 'D' },
        { id: 'messages', name: '私信', count: currentUserId ? this.getUnreadDirectMessageCount(currentUserId) : 0, icon: 'M' },
      ],
    };
  }

  getRecommendedUsers(currentUserId?: number) {
    const currentFollowing = currentUserId ? new Set(this.getFollowingIds(currentUserId)) : new Set<number>();
    return [...this.users.values()]
      .filter((user) => user.role === 'USER')
      .filter((user) => user.id !== currentUserId)
      .filter((user) => !currentFollowing.has(user.id))
      .map((user) => ({
        userId: String(user.id),
        username: user.nickname,
        avatar: user.avatarUrl,
        bio: user.bio ?? undefined,
        followerCount: this.getFollowerCount(user.id),
        reason: '身份服务推荐',
        followed: false,
      }))
      .sort((left, right) => (right.followerCount ?? 0) - (left.followerCount ?? 0))
      .slice(0, 8);
  }

  getRecentUpdates(currentUserId?: number) {
    const followingIds = currentUserId ? new Set(this.getFollowingIds(currentUserId)) : new Set<number>();
    return [...this.notifications.values()]
      .filter((notification) => notification.type === 'FOLLOW')
      .filter((notification) => !currentUserId || followingIds.has(notification.actorId ?? -1))
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .slice(0, 8)
      .map((notification) => {
        const actor = notification.actorId ? this.users.get(notification.actorId) : null;
        return {
          userId: String(notification.actorId ?? notification.recipientId),
          username: actor?.nickname ?? notification.title,
          avatar: actor?.avatarUrl ?? null,
          lastActionText: notification.content,
          lastUpdateAt: notification.createdAt.toISOString(),
        };
      });
  }

  likeDynamicPost(postId: number, userId: number) {
    const post = this.assertDynamicPostExists(postId);
    const user = this.assertUserExists(userId);
    const key = this.dynamicLikeKey(postId, userId);
    if (!this.dynamicPostLikes.has(key)) {
      this.dynamicPostLikes.set(key, { id: this.nextLikeId++, postId, userId, createdAt: new Date() });
      post.likeCount += 1;
      post.updatedAt = new Date();
      if (post.authorId !== userId) {
        this.createNotification({
          recipientId: post.authorId,
          actorId: userId,
          type: 'LIKE',
          title: '收到新的点赞',
          content: `${user.nickname} 点赞了你的动态`,
          relatedType: 'DYNAMIC_POST',
          relatedId: postId,
        });
      }
      this.refreshProfileSummary(userId);
      this.refreshProfileSummary(post.authorId);
    }
    return { postId, liked: true, likeCount: post.likeCount };
  }

  unlikeDynamicPost(postId: number, userId: number) {
    const post = this.assertDynamicPostExists(postId);
    this.assertUserExists(userId);
    if (this.dynamicPostLikes.delete(this.dynamicLikeKey(postId, userId))) {
      post.likeCount = Math.max(0, post.likeCount - 1);
      post.updatedAt = new Date();
      this.refreshProfileSummary(userId);
      this.refreshProfileSummary(post.authorId);
    }
    return { postId, liked: false, likeCount: post.likeCount };
  }

  listDynamicPostComments(postId: number) {
    this.assertDynamicPostExists(postId);
    return {
      postId,
      items: (this.dynamicPostComments.get(postId) ?? [])
        .filter((comment) => comment.status === 'NORMAL')
        .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())
        .map((comment) => this.toDynamicCommentSnapshot(comment)),
    };
  }

  createDynamicPostComment(postId: number, userId: number, content: string) {
    const post = this.assertDynamicPostExists(postId);
    const user = this.assertUserExists(userId);
    const comment: DynamicPostCommentRecord = {
      id: this.nextCommentId++,
      postId,
      userId,
      content: this.normalizeText(content, 1000, 'Comment content'),
      status: 'NORMAL',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const comments = this.dynamicPostComments.get(postId) ?? [];
    comments.push(comment);
    this.dynamicPostComments.set(postId, comments);
    post.commentCount += 1;
    post.updatedAt = new Date();
    this.refreshProfileSummary(userId);
    this.refreshProfileSummary(post.authorId);
    if (post.authorId !== userId) {
      this.createNotification({
        recipientId: post.authorId,
        actorId: user.id,
        type: 'COMMENT',
        title: '收到新的评论',
        content: `${user.nickname} 评论了你的动态：${comment.content.slice(0, 80)}`,
        relatedType: 'DYNAMIC_POST',
        relatedId: postId,
      });
    }
    return this.toDynamicCommentSnapshot(comment);
  }

  batchSummary(userIds: number[]) {
    const requestedIds = this.uniqueStable(userIds.map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0));
    const items: Array<{ id: number; username: string; nickname: string; avatarUrl: string | null; bio: string | null; role: UserRole; messagePrivacy: DirectMessagePrivacy; profileSummary: UserRecommendationProfileSnapshot['summary'] }> = [];
    const byId: Record<number, (typeof items)[number]> = {};
    const missingIds: number[] = [];
    for (const userId of requestedIds) {
      const user = this.users.get(userId);
      if (!user) {
        missingIds.push(userId);
        continue;
      }
      const snapshot = {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        role: user.role,
        messagePrivacy: user.messagePrivacy,
        profileSummary: this.buildRecommendationProfile(user.id).summary,
      };
      items.push(snapshot);
      byId[user.id] = snapshot;
    }
    return { requestedIds, items, byId, missingIds: this.uniqueStable(missingIds) };
  }

  userExists(userId: number) {
    return this.users.has(userId);
  }

  getFollowerCount(userId: number) {
    return [...this.followRelations.values()].filter((relation) => relation.followingId === userId).length;
  }

  getFollowingCount(userId: number) {
    return [...this.followRelations.values()].filter((relation) => relation.followerId === userId).length;
  }

  getFollowingIds(userId?: number) {
    if (!userId) {
      return [];
    }
    return [...this.followRelations.values()].filter((relation) => relation.followerId === userId).map((relation) => relation.followingId);
  }

  private seed() {
    const admin = this.createUser({
      username: 'demo_admin',
      email: 'admin@local.invalid',
      password: 'Admin123456!',
      nickname: '平台管理员',
      role: 'ADMIN',
      messagePrivacy: 'ALLOW_ALL',
    });
    const alice = this.createUser({
      username: 'creator_alice',
      email: 'alice@local.invalid',
      password: 'Alice123456!',
      nickname: 'Alice',
      messagePrivacy: 'FOLLOWING_ONLY',
    });
    const bob = this.createUser({
      username: 'viewer_bob',
      email: 'bob@local.invalid',
      password: 'Bob123456!',
      nickname: 'Bob',
    });
    const carol = this.createUser({
      username: 'creator_carol',
      email: 'carol@local.invalid',
      password: 'Carol123456!',
      nickname: 'Carol',
    });
    this.followRelations.set(this.followKey(bob.id, alice.id), { id: this.nextFollowId++, followerId: bob.id, followingId: alice.id, createdAt: new Date(Date.now() - 3_600_000) });
    this.followRelations.set(this.followKey(alice.id, carol.id), { id: this.nextFollowId++, followerId: alice.id, followingId: carol.id, createdAt: new Date(Date.now() - 1_800_000) });
    this.createDynamicPost(alice.id, '欢迎来到身份与社区服务，今天先把最小闭环跑通。', ['https://example.com/dynamic-1.jpg']);
    this.createDynamicPost(carol.id, '新的创作者草稿已经同步到社区页。', []);
    this.createNotification({
      recipientId: alice.id,
      actorId: bob.id,
      type: 'FOLLOW',
      title: '收到新的关注',
      content: 'Bob 关注了你',
      relatedType: 'USER',
      relatedId: bob.id,
    });
    this.directMessages.set(this.nextMessageId++, {
      id: this.nextMessageId - 1,
      senderId: bob.id,
      recipientId: alice.id,
      content: '你好，能看一下你的投稿进度吗？',
      isRead: false,
      readAt: null,
      createdAt: new Date(Date.now() - 600_000),
      updatedAt: new Date(Date.now() - 600_000),
    });
    this.directMessages.set(this.nextMessageId++, {
      id: this.nextMessageId - 1,
      senderId: alice.id,
      recipientId: bob.id,
      content: '可以，下午我再更新一次。',
      isRead: true,
      readAt: new Date(Date.now() - 300_000),
      createdAt: new Date(Date.now() - 480_000),
      updatedAt: new Date(Date.now() - 300_000),
    });
    this.refreshProfileSummary(admin.id);
    this.refreshProfileSummary(alice.id);
    this.refreshProfileSummary(bob.id);
    this.refreshProfileSummary(carol.id);
  }

  private createUser(payload: {
    username: string;
    email: string;
    password: string;
    nickname: string;
    role?: UserRole;
    messagePrivacy?: DirectMessagePrivacy;
  }) {
    const user: UserRecord = {
      id: this.nextUserId++,
      username: payload.username,
      email: payload.email,
      password: payload.password,
      role: payload.role ?? 'USER',
      nickname: payload.nickname,
      avatarUrl: null,
      bio: null,
      coinBalance: 10,
      messagePrivacy: payload.messagePrivacy ?? 'ALLOW_ALL',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.assertUserAvailability(user.username, user.email);
    this.users.set(user.id, user);
    this.usersByUsername.set(user.username, user.id);
    this.usersByEmail.set(user.email, user.id);
    this.profileSummaries.set(user.id, this.buildProfileSummary());
    return user;
  }

  private buildProfileSummary(): ProfileSummaryRecord {
    return {
      activityScore: 0,
      activityLevel: 'LOW',
      behaviorSignalCount: 0,
      viewerScore: 0,
      creatorScore: 0,
      creatorViewerTendency: 'COLD_START',
      isColdStart: true,
      updatedAt: new Date(),
    };
  }

  private refreshProfileSummary(userId: number) {
    if (!this.users.has(userId)) {
      return;
    }
    const followerCount = this.getFollowerCount(userId);
    const followingCount = this.getFollowingCount(userId);
    const postCount = [...this.dynamicPosts.values()].filter((post) => post.authorId === userId && post.status === 'NORMAL').length;
    const messageCount = [...this.directMessages.values()].filter((message) => message.senderId === userId || message.recipientId === userId).length;
    const behaviorSignalCount = followerCount + followingCount + postCount + messageCount;
    const activityScore = followerCount * 4 + followingCount * 2 + postCount * 5 + messageCount * 2;
    const viewerScore = followingCount * 2 + messageCount;
    const creatorScore = followerCount * 3 + postCount * 5;
    const activityLevel: ProfileSummaryRecord['activityLevel'] = activityScore >= 24 ? 'HIGH' : activityScore >= 10 ? 'MEDIUM' : 'LOW';
    const creatorViewerTendency: CreatorViewerTendency = behaviorSignalCount === 0
      ? 'COLD_START'
      : creatorScore > viewerScore * 1.2
        ? 'CREATOR'
        : viewerScore > creatorScore * 1.2
          ? 'VIEWER'
          : 'BALANCED';
    this.profileSummaries.set(userId, {
      activityScore,
      activityLevel,
      behaviorSignalCount,
      viewerScore,
      creatorScore,
      creatorViewerTendency,
      isColdStart: behaviorSignalCount === 0,
      updatedAt: new Date(),
    });
  }

  private buildRecommendationProfile(userId: number): UserRecommendationProfileSnapshot {
    const summary = this.profileSummaries.get(userId) ?? this.buildProfileSummary();
    return {
      userId,
      summary: {
        activityScore: summary.activityScore,
        activityLevel: summary.activityLevel,
        behaviorSignalCount: summary.behaviorSignalCount,
        viewerScore: summary.viewerScore,
        creatorScore: summary.creatorScore,
        creatorViewerTendency: summary.creatorViewerTendency,
        isColdStart: summary.isColdStart,
        updatedAt: summary.updatedAt.toISOString(),
      },
      categoryPreferences: [],
      creatorPreferences: [],
    };
  }

  private syncDailyFollowerSnapshot(userId: number) {
    void userId;
  }

  private assertUserAvailability(username: string, email: string) {
    if (this.usersByUsername.has(username)) {
      throw new IdentityStoreError(409, 'Username already exists');
    }
    if (this.usersByEmail.has(email)) {
      throw new IdentityStoreError(409, 'Email already exists');
    }
  }

  private assertUserExists(userId: number) {
    const user = this.users.get(userId);
    if (!user) {
      throw new IdentityStoreError(404, 'User not found');
    }
    return user;
  }

  private assertDynamicPostExists(postId: number) {
    const post = this.dynamicPosts.get(postId);
    if (!post || post.status !== 'NORMAL') {
      throw new IdentityStoreError(404, 'Dynamic post not found');
    }
    return post;
  }

  private assertNotificationExists(notificationId: number) {
    const notification = this.notifications.get(notificationId);
    if (!notification) {
      throw new IdentityStoreError(404, 'Notification not found');
    }
    return notification;
  }

  private findUserByAccount(account: string) {
    const trimmed = account.trim();
    const byUsername = this.usersByUsername.get(trimmed);
    if (byUsername !== undefined) {
      return this.users.get(byUsername) ?? null;
    }
    const normalizedEmail = this.normalizeEmail(trimmed);
    const byEmail = this.usersByEmail.get(normalizedEmail);
    return byEmail !== undefined ? this.users.get(byEmail) ?? null : null;
  }

  private issueSession(user: UserRecord) {
    const sessionNonce = randomUUID();
    this.activeSessionNonceByUserId.set(user.id, sessionNonce);
    return {
      token: `mock-token-${user.id}-${sessionNonce}`,
      userId: user.id,
      role: user.role,
      nickname: user.nickname,
      email: user.email,
      bio: user.bio,
    };
  }

  private loginWithAdminSecret(adminSecret: string) {
    if (adminSecret !== DEFAULT_ADMIN_SECRET) {
      throw new IdentityStoreError(401, 'Admin secret is invalid');
    }
    const admin = [...this.users.values()].find((user) => user.role === 'ADMIN');
    if (!admin) {
      throw new IdentityStoreError(503, 'Admin user is not available');
    }
    return this.issueSession(admin);
  }

  private listMessagesForUser(userId: number) {
    return [...this.directMessages.values()]
      .filter((message) => message.senderId === userId || message.recipientId === userId)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  }

  private resolveMessagePermission(senderId: number, recipientId: number, providedPrivacy?: DirectMessagePrivacy): DirectMessagePermissionSnapshot {
    const recipient = providedPrivacy ? { messagePrivacy: providedPrivacy } : this.assertUserExists(recipientId);
    const senderFollowsRecipient = this.isFollowing(recipientId, senderId);
    const recipientFollowsSender = this.isFollowing(senderId, recipientId);
    if (senderId === recipientId) {
      return {
        canSend: false,
        messagePrivacy: recipient.messagePrivacy,
        senderFollowsRecipient: false,
        recipientFollowsSender: false,
        reason: 'Cannot send private message to yourself',
      };
    }
    if (recipient.messagePrivacy === 'DISABLED') {
      return {
        canSend: false,
        messagePrivacy: recipient.messagePrivacy,
        senderFollowsRecipient,
        recipientFollowsSender,
        reason: 'Recipient has disabled private messages',
      };
    }
    if (recipient.messagePrivacy === 'FOLLOWING_ONLY' && !recipientFollowsSender) {
      return {
        canSend: false,
        messagePrivacy: recipient.messagePrivacy,
        senderFollowsRecipient,
        recipientFollowsSender,
        reason: 'Recipient only accepts messages from followers',
      };
    }
    return {
      canSend: true,
      messagePrivacy: recipient.messagePrivacy,
      senderFollowsRecipient,
      recipientFollowsSender,
    };
  }

  private toRegisterResponse(user: UserRecord) {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      nickname: user.nickname,
    };
  }

  private toAuthenticatedUser(user: UserRecord) {
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

  private toPublicUserSnapshot(user: UserRecord): PublicUserSnapshot {
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

  private toNotificationSnapshot(notification: NotificationRecord): NotificationSnapshot {
    const actor = notification.actorId ? this.users.get(notification.actorId) ?? null : null;
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
      actor: actor ? { id: actor.id, nickname: actor.nickname } : null,
    };
  }

  private toDirectMessageSnapshot(message: DirectMessageRecord): DirectMessageSnapshot {
    const sender = this.assertUserExists(message.senderId);
    return {
      id: message.id,
      senderId: message.senderId,
      recipientId: message.recipientId,
      content: message.content,
      isRead: message.isRead,
      readAt: message.readAt ? message.readAt.toISOString() : null,
      createdAt: message.createdAt.toISOString(),
      sender: {
        id: sender.id,
        nickname: sender.nickname,
        avatarUrl: sender.avatarUrl,
      },
    };
  }

  private toDynamicPostSnapshot(post: DynamicPostRecord, liked: boolean): DynamicPostSnapshot {
    const author = this.assertUserExists(post.authorId);
    return {
      id: post.id,
      authorId: post.authorId,
      content: post.content,
      images: [...post.images],
      status: post.status,
      likeCount: post.likeCount,
      commentCount: post.commentCount,
      favoriteCount: post.favoriteCount,
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
      liked,
      author: {
        id: String(author.id),
        username: author.nickname,
        avatar: author.avatarUrl,
      },
    };
  }

  private toDynamicCommentSnapshot(comment: DynamicPostCommentRecord): DynamicPostCommentSnapshot {
    const user = this.assertUserExists(comment.userId);
    return {
      id: comment.id,
      postId: comment.postId,
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
      user: {
        id: user.id,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  private normalizeUsername(value: string) {
    const trimmed = value.trim();
    if (!trimmed) {
      throw new IdentityStoreError(400, 'Username is required');
    }
    if (trimmed.length > 64) {
      throw new IdentityStoreError(400, 'Username must not exceed 64 characters');
    }
    return trimmed;
  }

  private normalizeNickname(value: string) {
    const trimmed = value.trim();
    if (!trimmed) {
      throw new IdentityStoreError(400, 'Nickname is required');
    }
    return trimmed.slice(0, 64);
  }

  private normalizePassword(value: string) {
    const trimmed = value.trim();
    if (trimmed.length < 6) {
      throw new IdentityStoreError(400, 'Password must contain at least 6 characters');
    }
    return trimmed;
  }

  private normalizeEmail(value: string) {
    const trimmed = value.trim().toLowerCase();
    if (!trimmed.includes('@')) {
      throw new IdentityStoreError(400, 'Email is invalid');
    }
    if (trimmed.length > 128) {
      throw new IdentityStoreError(400, 'Email must not exceed 128 characters');
    }
    return trimmed;
  }

  private normalizeText(value: string, maxLength: number, label: string) {
    const trimmed = value.trim();
    if (!trimmed) {
      throw new IdentityStoreError(400, `${label} is required`);
    }
    if (trimmed.length > maxLength) {
      throw new IdentityStoreError(400, `${label} must not exceed ${maxLength} characters`);
    }
    return trimmed;
  }

  private buildRegistrationEmail(username: string) {
    const encoded = Buffer.from(username, 'utf8').toString('hex');
    return `user-${encoded}@local.invalid`;
  }

  private buildPostTitle(content: string) {
    return content.length <= 24 ? content : `${content.slice(0, 24)}...`;
  }

  private uniqueStable(values: number[]) {
    const seen = new Set<number>();
    const output: number[] = [];
    for (const value of values) {
      if (!seen.has(value)) {
        seen.add(value);
        output.push(value);
      }
    }
    return output;
  }

  private followKey(followerId: number, followingId: number) {
    return `${followerId}:${followingId}`;
  }

  private dynamicLikeKey(postId: number, userId: number) {
    return `${postId}:${userId}`;
  }

  private parseSessionToken(authHeader?: string | string[]) {
    const normalizedHeader = Array.isArray(authHeader) ? authHeader[0] : authHeader;
    const token = normalizedHeader?.replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      return null;
    }
    const match = /^mock-token-(\d+)-(.+)$/.exec(token);
    if (!match) {
      return null;
    }
    const userId = Number(match[1]);
    const sessionNonce = match[2] ?? '';
    if (!Number.isInteger(userId) || userId < 1 || !sessionNonce) {
      return null;
    }
    return { userId, sessionNonce };
  }
}
