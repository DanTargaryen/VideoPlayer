import http from './http';
import type {
  ApiResponse,
  CommentListResponse,
  CommentReply,
  CreatorDashboardData,
  CreatorVideo,
  DanmakuItem,
  LiveFrameResponse,
  LiveRoomInfo,
  LiveMessage,
  LiveRtcExchangeResponse,
  LiveReplaySaveResponse,
  LiveSessionInfo,
  LiveStartResponse,
  LiveViewerAnswerResponse,
  LiveViewerTicket,
  LoginResponse,
  NotificationItem,
  PendingLiveViewer,
  ReportItem,
  ReviewHistoryItem,
  SessionDescriptionPayload,
  ReviewQueueItem,
  SearchResultResponse,
  TextReviewItem,
  UserHomepage,
  VideoCard,
  VideoDetail,
} from '@/types/api';

export async function login(payload: { account: string; password: string; adminSecret?: string }) {
  const { data } = await http.post<ApiResponse<LoginResponse>>('/auth/login', payload);
  return data.data;
}

export async function fetchRecommendFeed(params?: { categoryCode?: string; page?: number; pageSize?: number }) {
  const { data } = await http.get<ApiResponse<VideoCard[]>>('/feeds/recommend', {
    params,
  });
  return data.data;
}

export async function createLiveRoom(payload: {
  title: string;
  categoryId?: number;
  coverUrl?: string;
  sourceMode?: 'camera' | 'screen';
}) {
  const { data } = await http.post<ApiResponse<LiveRoomInfo>>('/lives/rooms', payload);
  return data.data;
}

export async function fetchLiveRooms(params?: {
  keyword?: string;
  status?: 'IDLE' | 'LIVING' | 'ENDED';
  categoryId?: number;
  broadcasterId?: number;
  limit?: number;
}) {
  const { data } = await http.get<ApiResponse<LiveRoomInfo[]>>('/lives/rooms', {
    params,
  });
  return data.data;
}

export async function fetchLiveRoom(roomId: number) {
  const { data } = await http.get<ApiResponse<LiveRoomInfo>>(`/lives/rooms/${roomId}`);
  return data.data;
}

export async function publishLiveRoom(roomId: number, payload: SessionDescriptionPayload) {
  const { data } = await http.post<ApiResponse<LiveRtcExchangeResponse>>(`/lives/rooms/${roomId}/publish`, payload);
  return data.data;
}

export async function playLiveRoom(roomId: number, payload: SessionDescriptionPayload) {
  const { data } = await http.post<ApiResponse<LiveRtcExchangeResponse>>(`/lives/rooms/${roomId}/play`, payload);
  return data.data;
}

export async function fetchLiveFrame(roomId: number) {
  const { data } = await http.get<ApiResponse<LiveFrameResponse>>(`/lives/rooms/${roomId}/frame`);
  return data.data;
}

export async function updateLiveFrame(roomId: number, payload: { image: string }) {
  const { data } = await http.post<ApiResponse<LiveFrameResponse>>(`/lives/rooms/${roomId}/frame`, payload);
  return data.data;
}

export async function startLiveRoom(roomId: number) {
  const { data } = await http.post<ApiResponse<LiveStartResponse>>(`/lives/rooms/${roomId}/start`);
  return data.data;
}

export async function stopLiveRoom(roomId: number) {
  const { data } = await http.post<ApiResponse<LiveStartResponse>>(`/lives/rooms/${roomId}/stop`);
  return data.data;
}

export async function fetchLiveSession(sessionId: number) {
  const { data } = await http.get<ApiResponse<LiveSessionInfo>>(`/lives/sessions/${sessionId}`);
  return data.data;
}

export async function createLiveViewer(roomId: number) {
  const { data } = await http.post<ApiResponse<LiveViewerTicket>>(`/lives/rooms/${roomId}/viewers`);
  return data.data;
}

export async function leaveLiveViewer(roomId: number, viewerId: number) {
  const { data } = await http.delete<ApiResponse<{ roomId: number; viewerId: number; removed: boolean }>>(
    `/lives/rooms/${roomId}/viewers/${viewerId}`,
  );
  return data.data;
}

export async function submitLiveViewerOffer(roomId: number, viewerId: number, payload: SessionDescriptionPayload) {
  const { data } = await http.post<ApiResponse<{ roomId: number; viewerId: number; received: boolean }>>(
    `/lives/rooms/${roomId}/viewers/${viewerId}/offer`,
    payload,
  );
  return data.data;
}

export async function fetchPendingLiveViewers(roomId: number) {
  const { data } = await http.get<ApiResponse<PendingLiveViewer[]>>(`/lives/rooms/${roomId}/publisher/pending-viewers`);
  return data.data;
}

export async function submitLiveViewerAnswer(roomId: number, viewerId: number, payload: SessionDescriptionPayload) {
  const { data } = await http.post<ApiResponse<{ roomId: number; viewerId: number; delivered: boolean }>>(
    `/lives/rooms/${roomId}/viewers/${viewerId}/answer`,
    payload,
  );
  return data.data;
}

export async function fetchLiveViewerAnswer(roomId: number, viewerId: number) {
  const { data } = await http.get<ApiResponse<LiveViewerAnswerResponse>>(
    `/lives/rooms/${roomId}/viewers/${viewerId}/answer`,
  );
  return data.data;
}

export async function fetchLiveMessages(roomId: number) {
  const { data } = await http.get<ApiResponse<LiveMessage[]>>(`/lives/rooms/${roomId}/messages`);
  return data.data;
}

export async function createLiveMessage(roomId: number, payload: { content: string }) {
  const { data } = await http.post<ApiResponse<LiveMessage>>(`/lives/rooms/${roomId}/messages`, payload);
  return data.data;
}

export async function fetchFollowingFeed() {
  const { data } = await http.get<ApiResponse<VideoCard[]>>('/feeds/following');
  return data.data;
}

export async function searchAll(payload: {
  keyword: string;
  tab?: 'video' | 'live' | 'user';
  sortBy?: 'hot' | 'latest';
  category?: string;
  page?: number;
  pageSize?: number;
}) {
  const { data } = await http.get<ApiResponse<SearchResultResponse>>('/search/all', {
    params: payload,
  });
  return data.data;
}

export async function fetchVideoDetail(id: number) {
  const { data } = await http.get<ApiResponse<VideoDetail>>(`/videos/${id}`);
  return data.data;
}

export async function fetchRelatedVideos(videoId: number) {
  const { data } = await http.get<ApiResponse<VideoCard[]>>(`/videos/${videoId}/recommendations`);
  return data.data;
}

export async function fetchUserHomepage(id: number) {
  const { data } = await http.get<ApiResponse<UserHomepage>>(`/users/${id}/homepage`);
  return data.data;
}

export async function uploadVideo(file: File, assetType: 'ORIGINAL' | 'COVER' | 'RECORDING' = 'ORIGINAL') {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await http.post<
    ApiResponse<{ assetId: number; uploadToken: string; url: string; objectKey: string; assetType: string }>
  >('/videos/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    params: { assetType },
  });
  return data.data;
}

export async function saveLiveReplay(
  roomId: number,
  payload: {
    saveMode: 'REPLAY' | 'UPLOAD';
    assetId?: number;
    uploadToken?: string;
    title?: string;
    description?: string;
    categoryId?: number;
    coverUrl?: string;
    coverAssetId?: number;
    coverUploadToken?: string;
  },
) {
  const { data } = await http.post<ApiResponse<LiveReplaySaveResponse>>(`/lives/rooms/${roomId}/replay`, payload);
  return data.data;
}

export async function createVideo(payload: {
  assetId?: number;
  uploadToken?: string;
  title: string;
  description: string;
  categoryId: number;
  coverUrl?: string;
  coverAssetId?: number;
  coverUploadToken?: string;
}) {
  const { data } = await http.post<ApiResponse<CreatorVideo>>('/videos', payload);
  return data.data;
}

export async function updateVideoDraft(
  videoId: number,
  payload: { title?: string; description?: string; categoryId?: number; coverUrl?: string },
) {
  const { data } = await http.put<ApiResponse<CreatorVideo>>(`/videos/${videoId}`, payload);
  return data.data;
}

export async function fetchVideoReviews(videoId: number) {
  const { data } = await http.get<ApiResponse<ReviewHistoryItem[]>>(`/videos/${videoId}/reviews`);
  return data.data;
}

export async function fetchCreatorDashboard() {
  const { data } = await http.get<ApiResponse<CreatorDashboardData>>('/creator/dashboard');
  return data.data;
}

export async function fetchCreatorVideos() {
  const { data } = await http.get<ApiResponse<CreatorVideo[]>>('/creator/videos');
  return data.data;
}

export async function submitReview(videoId: number) {
  const { data } = await http.post<ApiResponse<Record<string, unknown>>>(`/videos/${videoId}/submit-review`);
  return data.data;
}

export async function fetchAdminDashboard() {
  const { data } = await http.get<ApiResponse<Record<string, number | string>>>('/admin/dashboard');
  return data.data;
}

export async function fetchReviewQueue() {
  const { data } = await http.get<ApiResponse<ReviewQueueItem[]>>('/admin/reviews/videos');
  return data.data;
}

export async function reviewVideo(reviewId: number, action: 'APPROVE' | 'REJECT', reason?: string) {
  const { data } = await http.post<ApiResponse<Record<string, unknown>>>(`/admin/reviews/videos/${reviewId}`, {
    action,
    reason,
  });
  return data.data;
}

export async function fetchTextReviewQueue(targetType?: 'COMMENT' | 'VIDEO_DANMAKU') {
  const { data } = await http.get<ApiResponse<TextReviewItem[]>>('/admin/reviews/text-content', {
    params: targetType ? { targetType } : {},
  });
  return data.data;
}

export async function moderateTextContent(
  targetType: 'COMMENT' | 'VIDEO_DANMAKU',
  id: number,
  action: 'KEEP' | 'HIDE' | 'DELETE',
  reason?: string,
) {
  const { data } = await http.post<ApiResponse<Record<string, unknown>>>(
    `/admin/reviews/text-content/${targetType}/${id}`,
    { action, reason },
  );
  return data.data;
}

export async function fetchReports() {
  const { data } = await http.get<ApiResponse<ReportItem[]>>('/admin/reports');
  return data.data;
}

export async function handleReport(reportId: number, action: 'KEEP' | 'HIDE' | 'DELETE', reason?: string) {
  const { data } = await http.post<ApiResponse<Record<string, unknown>>>(`/admin/reports/${reportId}`, {
    action,
    reason,
  });
  return data.data;
}

export async function fetchComments(videoId: number) {
  const { data } = await http.get<ApiResponse<CommentListResponse>>(`/videos/${videoId}/comments`);
  return data.data;
}

export async function createComment(
  videoId: number,
  payload: { content: string; parentId?: number; rootId?: number },
) {
  const { data } = await http.post<ApiResponse<CommentReply>>(`/videos/${videoId}/comments`, payload);
  return data.data;
}

export async function reportContent(payload: {
  targetType: 'VIDEO' | 'COMMENT' | 'VIDEO_DANMAKU';
  targetId: number;
  reason: string;
}) {
  const { data } = await http.post<ApiResponse<Record<string, unknown>>>('/reports', payload);
  return data.data;
}

export async function followUser(userId: number) {
  const { data } = await http.post<ApiResponse<{ id: number; followed: boolean }>>(`/users/${userId}/follow`);
  return data.data;
}

export async function unfollowUser(userId: number) {
  const { data } = await http.delete<ApiResponse<{ id: number; followed: boolean }>>(`/users/${userId}/follow`);
  return data.data;
}

export async function fetchNotifications() {
  const { data } = await http.get<ApiResponse<NotificationItem[]>>('/notifications');
  return data.data;
}

export async function fetchUnreadNotificationCount() {
  const { data } = await http.get<ApiResponse<{ unreadCount: number }>>('/notifications/unread-count');
  return data.data;
}

export async function readAllNotifications() {
  const { data } = await http.post<ApiResponse<{ success: boolean }>>('/notifications/read-all');
  return data.data;
}

export async function likeVideo(videoId: number) {
  const { data } = await http.post<ApiResponse<{ liked: boolean }>>(`/videos/${videoId}/like`);
  return data.data;
}

export async function unlikeVideo(videoId: number) {
  const { data } = await http.delete<ApiResponse<{ liked: boolean }>>(`/videos/${videoId}/like`);
  return data.data;
}

export async function favoriteVideo(videoId: number) {
  const { data } = await http.post<ApiResponse<{ favorited: boolean }>>(`/videos/${videoId}/favorite`);
  return data.data;
}

export async function unfavoriteVideo(videoId: number) {
  const { data } = await http.delete<ApiResponse<{ favorited: boolean }>>(`/videos/${videoId}/favorite`);
  return data.data;
}

export async function fetchDanmakus(videoId: number, fromMs = 0, toMs = 600000) {
  const { data } = await http.get<ApiResponse<DanmakuItem[]>>(`/videos/${videoId}/danmaku`, {
    params: { fromMs, toMs },
  });
  return data.data;
}

export async function createDanmaku(
  videoId: number,
  payload: { content: string; timeOffsetMs: number; color?: string },
) {
  const { data } = await http.post<ApiResponse<DanmakuItem>>(`/videos/${videoId}/danmaku`, payload);
  return data.data;
}



