export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export interface LoginResponse {
  token: string;
  userId: number;
  role: 'USER' | 'ADMIN';
  nickname: string;
  email: string;
}

export interface RegisterResponse {
  id: number;
  username: string;
  email: string;
  role: 'USER' | 'ADMIN';
  nickname: string;
}

export interface VideoCard {
  id: number;
  title: string;
  status: string;
  coverUrl: string;
  description: string;
  category?: string;
  categories?: string[];
  playUrl?: string;
  durationSeconds?: number | null;
  playCount?: number;
  likeCount: number;
  favoriteCount: number;
  commentCount: number;
  coinCount?: number;
  creatorId?: number;
  creator?: {
    id: number;
    nickname: string;
    avatarUrl?: string | null;
  };
  publishedAt?: string | null;
  createdAt?: string;
}

export interface CreatorVideo extends VideoCard {
  creatorId: number;
  category: string;
  categories?: string[];
  uploadToken: string;
  rejectReason?: string | null;
  submittedAt?: string | null;
  publishedAt?: string | null;
  durationSeconds?: number;
  updatedAt?: string;
}

export interface ReviewQueueItem {
  id: number;
  videoId: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reason?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
  reviewer?: {
    id: number;
    nickname: string;
  } | null;
  video: CreatorVideo | null;
}

export interface ReviewHistoryItem {
  id: number;
  videoId: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reason?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
  reviewer?: {
    id: number;
    nickname: string;
  } | null;
}

export interface VideoDetail extends CreatorVideo {
  creator: {
    id: number;
    nickname: string;
    avatarUrl?: string | null;
    role: 'USER' | 'ADMIN';
    followerCount: number;
  };
  isFollowingCreator: boolean;
  isLiked: boolean;
  isFavorited: boolean;
  myCoinCount: number;
  myCoinLimit: number;
}

export interface CoinWallet {
  balance: number;
  totalClaimed: number;
  totalSpent: number;
  claimedToday: boolean;
  todayClaimAmount: number;
}

export interface DailyClaimResponse {
  claimed: boolean;
  amount: number;
  balance: number;
  claimedToday: boolean;
}

export interface VideoCoinResponse {
  videoId: number;
  amount: number;
  userVideoCoinCount: number;
  videoCoinCount: number;
  balance: number;
}

export interface StreakMilestone {
  day: number;
  claimed: boolean;
  reached: boolean;
}

export interface StreakInfo {
  streak: number;
  claimedToday: boolean;
  milestones: StreakMilestone[];
}

export interface StreakClaimResponse {
  claimed: boolean;
  amount: number;
  balance: number;
  message?: string;
}

export interface VideoWatchProgressPayload {
  watchedSeconds: number;
  currentTimeSeconds: number;
  videoDurationSeconds?: number;
  event: 'pause' | 'leave' | 'ended';
}

export interface CommentReply {
  id: number;
  videoId: number;
  userId: number;
  parentId: number | null;
  rootId: number | null;
  content: string;
  imageUrl?: string | null;
  replyCount: number;
  status: 'NORMAL' | 'HIDDEN' | 'DELETED';
  createdAt: string;
  updatedAt: string;
  isPendingGrok?: boolean;
  user: {
    id: number;
    nickname: string;
    avatarUrl?: string | null;
  };
  replies: CommentReply[];
}

export type CommentItem = CommentReply;

export interface CommentListResponse {
  videoId: number;
  items: CommentItem[];
}

export interface NotificationItem {
  id: number;
  recipientId: number;
  actorId: number | null;
  type: 'COMMENT' | 'REPLY' | 'FOLLOW' | 'SYSTEM' | 'LIKE' | 'FAVORITE' | 'REPORT';
  title: string;
  content: string;
  relatedType: string | null;
  relatedId: number | null;
  isRead: boolean;
  createdAt: string;
  actor?: {
    id: number;
    nickname: string;
  } | null;
}

export interface DanmakuItem {
  id: number;
  videoId: number;
  userId: number;
  content: string;
  color: string;
  timeOffsetMs: number;
  status: 'NORMAL' | 'HIDDEN' | 'DELETED';
  createdAt: string;
  user: {
    id: number;
    nickname: string;
  };
}

export interface UserHomepage {
  id: number;
  nickname: string;
  avatarUrl?: string | null;
  bio?: string | null;
  messagePrivacy?: DirectMessagePrivacy;
  followers: number;
  following: number;
  videos: number;
  isFollowing: boolean;
  coinBalance?: number;
  items: VideoCard[];
}

export type DirectMessagePrivacy = 'ALLOW_ALL' | 'FOLLOWING_ONLY' | 'DISABLED';

export interface DirectMessageUser {
  id: number;
  nickname: string;
  avatarUrl?: string | null;
}

export interface DirectMessagePermission {
  canSend: boolean;
  messagePrivacy: DirectMessagePrivacy;
  senderFollowsRecipient: boolean;
  recipientFollowsSender: boolean;
  reason?: string;
}

export interface DirectMessageItem {
  id: number;
  senderId: number;
  recipientId: number;
  content: string;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
  sender: DirectMessageUser;
}

export interface DirectMessageConversationSummary extends DirectMessagePermission {
  user: DirectMessageUser;
  unreadCount: number;
  lastMessage: {
    id: number;
    content: string;
    createdAt: string;
    senderId: number;
  };
}

export interface DirectMessageConversationDetail extends DirectMessagePermission {
  targetUser: DirectMessageUser & { messagePrivacy: DirectMessagePrivacy };
  messages: DirectMessageItem[];
}

export interface TextReviewItem {
  id: number;
  targetType: 'COMMENT' | 'VIDEO_DANMAKU';
  status: 'NORMAL' | 'HIDDEN' | 'DELETED';
  content: string;
  user: { id: number; nickname: string };
  video: { id: number; title: string };
  createdAt: string;
}

export interface ReportItem {
  id: number;
  targetType: 'VIDEO' | 'COMMENT' | 'VIDEO_DANMAKU';
  reason: string;
  status: 'PENDING' | 'PROCESSED' | 'REJECTED';
  createdAt: string;
  reporter?: { id: number; nickname: string } | null;
  video?: { id: number; title: string } | null;
  comment?: { id: number; content: string; status: string } | null;
  danmaku?: { id: number; content: string; status: string } | null;
}

export interface SearchResultResponse {
  keyword: string;
  tab: 'video' | 'live' | 'user';
  sortBy: 'best' | 'hot' | 'latest';
  categoryCode: string;
  page: number;
  pageSize: number;
  video: VideoCard[];
  live: LiveRoomInfo[];
  user: Array<{ id: number; nickname: string }>;
}

export interface LiveMessage {
  id: number;
  roomId: number;
  kind: 'CHAT' | 'SYSTEM';
  content: string;
  createdAt: string;
  sender: {
    id: number | null;
    nickname: string;
  };
}

export interface SearchSuggestResponse {
  list: string[];
}

export interface CreatorDashboardData {
  id: number;
  username: string;
  nickname: string;
  avatarUrl?: string | null;
  bio?: string | null;
  email: string;
  messagePrivacy: DirectMessagePrivacy;
  role: 'USER' | 'ADMIN';
  createdAt: string;
  totalVideos: number;
  pendingReviews: number;
  publishedVideos: number;
  rejectedVideos: number;
  followerCount: number;
  followingCount: number;
  totalLikes: number;
  totalFavorites: number;
  totalComments: number;
  coinBalance: number;
  recentRejectedVideos: Array<{
    id: number;
    title: string;
    rejectReason?: string | null;
    updatedAt: string;
  }>;
}

export interface LiveRoomInfo {
  id: number;
  sessionId?: number;
  title: string;
  category: string;
  coverUrl?: string;
  sourceMode?: 'camera' | 'screen' | string;
  streamKey: string;
  rtmpUrl: string;
  playUrl: string;
  viewerCount?: number;
  status?: 'IDLE' | 'LIVING' | 'ENDED' | string;
  createdAt?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
  replayUrl?: string | null;
  replayVideoId?: number | null;
  broadcaster?: {
    id: number;
    nickname: string;
    avatarUrl?: string | null;
  };
}

export interface LiveCategoryItem {
  code: string;
  label: string;
}

export interface LiveCenterOverview {
  metrics: {
    livingRoomCount: number;
    myLivingRoomCount: number;
    identity: {
      label: string;
      description: string;
    };
    todayViewerCount: number;
  };
  myRoom: LiveRoomInfo | null;
  categories: LiveCategoryItem[];
  tips: string[];
}

export interface LivePlazaResponse {
  list: LiveRoomInfo[];
  total: number;
  categories: LiveCategoryItem[];
}

export interface LiveStartResponse {
  roomId: number;
  sessionId: number;
  status: 'LIVING' | string;
}

export interface LiveSessionInfo {
  id: number;
  roomId: number;
  title: string;
  status: 'IDLE' | 'LIVING' | 'ENDED' | string;
  playUrl?: string;
  coverUrl?: string;
  sourceMode?: 'camera' | 'screen' | string;
  viewerCount?: number;
  startedAt?: string | null;
  endedAt?: string | null;
  replayUrl?: string | null;
  replayVideoId?: number | null;
  broadcaster?: {
    id: number;
    nickname: string;
    avatarUrl?: string | null;
  };
}

export interface LiveReplaySaveResponse {
  roomId: number;
  replayUrl: string;
  replayVideoId: number | null;
  saveMode: 'REPLAY' | 'UPLOAD';
}

export interface LiveRtcExchangeResponse {
  type: 'answer';
  sdp: string;
  sessionId: string | null;
  server: string | null;
}

export interface LiveFrameResponse {
  image: string | null;
  updatedAt: string | null;
}

export interface SessionDescriptionPayload {
  type: 'offer' | 'answer';
  sdp: string;
}

export interface LiveViewerTicket {
  roomId: number;
  viewerId: number;
  status: 'LIVING' | string;
}

export interface PendingLiveViewer {
  viewerId: number;
  offer: SessionDescriptionPayload;
  updatedAt: string;
}

export interface LiveViewerAnswerResponse {
  ready: boolean;
  answer: SessionDescriptionPayload | null;
  updatedAt: string;
}

export interface CreatorPlayTrendPoint {
  date: string;
  playCount: number;
}

export interface CreatorFollowerTrendPoint {
  date: string;
  followerCount: number;
}

export interface FollowUserItem {
  id: number;
  nickname: string;
  avatarUrl?: string | null;
  followedAt: string;
}

export type DynamicFeedType = 'all' | 'video' | 'post' | 'image_text' | 'text' | 'image' | 'live' | 'recommend';
export type DynamicFeedSource = 'following' | 'recommended';

export interface DynamicFeedAuthor {
  id: string;
  username: string;
  avatar: string | null;
}

export interface DynamicFeedItem {
  id: string;
  type: 'video' | 'post' | 'image_text' | 'text' | 'image' | 'live' | 'recommend';
  source: DynamicFeedSource;
  author: DynamicFeedAuthor;
  actionText: string;
  title: string;
  description?: string;
  cover?: string;
  images?: string[];
  duration?: number;
  category?: string;
  createdAt: string;
  stats?: {
    views?: number;
    likes?: number;
    comments?: number;
    favorites?: number;
    liked?: boolean;
  };
  live?: {
    isLive: boolean;
    roomId?: string;
    viewerCount?: number;
  };
}

export interface DynamicPostItem {
  id: string;
  author: DynamicFeedAuthor;
  content: string;
  images: string[];
  createdAt: string;
  likeCount: number;
  commentCount: number;
  favoriteCount: number;
  liked: boolean;
}

export interface DynamicPostCommentItem {
  id: number;
  postId: number;
  content: string;
  createdAt: string;
  user: {
    id: number;
    nickname: string;
    avatarUrl?: string | null;
  };
}

export interface DynamicPostCommentList {
  postId: number;
  items: DynamicPostCommentItem[];
}

export interface DynamicPostLikeResult {
  postId: number;
  liked: boolean;
  likeCount: number;
}

export interface DynamicFeedResponse {
  list: DynamicFeedItem[];
  page: number;
  pageSize: number;
  hasMore: boolean;
  meta: {
    isGuest: boolean;
    followingCount: number;
    followingItemCount: number;
    recommendedItemCount: number;
  };
}

export interface SidebarLiveItem {
  id: string;
  roomId: string;
  title: string;
  cover: string;
  authorName: string;
  avatar: string | null;
  viewerCount: number;
  category: string;
  isLive: boolean;
}

export interface SidebarRecentUpdateItem {
  userId: string;
  username: string;
  avatar: string | null;
  lastActionText: string;
  lastUpdateAt: string;
}

export interface SidebarRecommendedUser {
  userId: string;
  username: string;
  avatar: string | null;
  bio?: string;
  followerCount?: number;
  reason?: string;
  followed: boolean;
}

export interface FollowGroupItem {
  id: string;
  name: string;
  count: number;
  icon: string;
}

export interface SidebarProfileStats {
  followingCount: number;
  followerCount: number;
  dynamicCount: number;
}

export interface DynamicSidebarOverview {
  profileStats: SidebarProfileStats;
  groups: FollowGroupItem[];
}

export interface HotTopicItem {
  id: string;
  name: string;
  discussionCount: number;
  isRising?: boolean;
}

export interface FavoriteFolderSummary {
  id: number;
  name: string;
  isDefault: boolean;
  videoCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface FavoriteVideoResult {
  favorited: boolean;
  folderId?: number;
  folderName?: string;
}

export interface MyVideoItem {
  id: number;
  title: string;
  description: string;
  coverUrl: string;
  category: string;
  categories?: string[];
  likeCount: number;
  favoriteCount: number;
  commentCount: number;
  coinCount?: number;
  creator: { id: number; nickname: string; avatarUrl?: string | null };
  favoritedAt?: string;
  folderId?: number | null;
  likedAt?: string;
  watchedAt?: string | null;
}

export interface VideoAiSummaryResult {
  success: boolean;
  videoId: number;
  summary: string;
  frameCount: number;
  cached: boolean;
}

export type VideoAiChatTaskType = 'summarize' | 'analyze_highlights' | 'locate_key_segments' | 'free_chat';

export interface VideoAiChatResult {
  success: boolean;
  videoId: number;
  reply: string;
  model?: string;
  frameCount: number;
  userMessageId?: number;
  assistantMessageId?: number;
}

export interface VideoAiChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  model?: string | null;
  frameCount?: number | null;
  createdAt: string;
}

export interface VideoAiChatHistoryResult {
  success: boolean;
  videoId: number;
  frameCount: number;
  messages: VideoAiChatMessage[];
}
