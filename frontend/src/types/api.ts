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
  playUrl?: string;
  likeCount: number;
  favoriteCount: number;
  commentCount: number;
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
  replyCount: number;
  status: 'NORMAL' | 'HIDDEN' | 'DELETED';
  createdAt: string;
  updatedAt: string;
  user: {
    id: number;
    nickname: string;
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
  followers: number;
  following: number;
  videos: number;
  isFollowing: boolean;
  items: VideoCard[];
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
  role: 'USER' | 'ADMIN';
  totalVideos: number;
  pendingReviews: number;
  publishedVideos: number;
  rejectedVideos: number;
  followerCount: number;
  followingCount: number;
  totalLikes: number;
  totalFavorites: number;
  totalComments: number;
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
  };
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

export interface FollowUserItem {
  id: number;
  nickname: string;
  avatarUrl?: string | null;
  followedAt: string;
}

export interface MyVideoItem {
  id: number;
  title: string;
  description: string;
  coverUrl: string;
  category: string;
  likeCount: number;
  favoriteCount: number;
  commentCount: number;
  creator: { id: number; nickname: string };
  favoritedAt?: string;
  likedAt?: string;
}

export interface VideoAiSummaryResult {
  success: boolean;
  videoId: number;
  summary: string;
  frameCount: number;
  cached: boolean;
}

export interface VideoAiChatResult {
  success: boolean;
  videoId: number;
  reply: string;
  frameCount: number;
}
