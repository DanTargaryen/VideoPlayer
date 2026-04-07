import http from './http';
import type {
  ApiResponse,
  CommentListResponse,
  CommentReply,
  CreatorVideo,
  DanmakuItem,
  LoginResponse,
  NotificationItem,
  ReportItem,
  ReviewQueueItem,
  TextReviewItem,
  UserHomepage,
  VideoCard,
  VideoDetail,
} from '@/types/api';

export async function login(payload: { account: string; password: string; adminSecret?: string }) {
  const { data } = await http.post<ApiResponse<LoginResponse>>('/auth/login', payload);
  return data.data;
}

export async function fetchRecommendFeed() {
  const { data } = await http.get<ApiResponse<VideoCard[]>>('/feeds/recommend');
  return data.data;
}

export async function fetchFollowingFeed() {
  const { data } = await http.get<ApiResponse<VideoCard[]>>('/feeds/following');
  return data.data;
}

export async function searchAll(keyword: string) {
  const { data } = await http.get<ApiResponse<{ keyword: string; video: VideoCard[]; live: never[]; user: Array<{ id: number; nickname: string }> }>>('/search/all', {
    params: { keyword },
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

export async function uploadVideo(file: File, assetType: 'ORIGINAL' | 'COVER' = 'ORIGINAL') {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await http.post<ApiResponse<{ assetId: number; uploadToken: string; url: string; objectKey: string; assetType: string }>>(
    '/videos/upload',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      params: { assetType },
    },
  );
  return data.data;
}

export async function createVideo(payload: {
  assetId: number;
  title: string;
  description: string;
  categoryId: number;
  coverUrl?: string;
  coverAssetId?: number;
}) {
  const { data } = await http.post<ApiResponse<CreatorVideo>>('/videos', payload);
  return data.data;
}

export async function fetchCreatorDashboard() {
  const { data } = await http.get<ApiResponse<Record<string, number | string>>>('/creator/dashboard');
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

export async function toggleVideoLike(videoId: number) {
  const { data } = await http.post<ApiResponse<{ liked: boolean }>>(`/videos/${videoId}/like`);
  return data.data;
}

export async function toggleVideoFavorite(videoId: number) {
  const { data } = await http.post<ApiResponse<{ favorited: boolean }>>(`/videos/${videoId}/favorite`);
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
