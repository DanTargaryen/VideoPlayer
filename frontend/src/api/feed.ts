import http from './http';
import type {
  ApiResponse,
  DynamicFeedResponse,
  DynamicSidebarOverview,
  DynamicPostItem,
  DynamicPostCommentItem,
  DynamicPostCommentList,
  DynamicPostLikeResult,
  DynamicFeedType,
  SidebarLiveItem,
  SidebarRecentUpdateItem,
  SidebarRecommendedUser,
} from '@/types/api';

export async function getDynamicFeed(params?: {
  type?: DynamicFeedType;
  page?: number;
  pageSize?: number;
  authorId?: number;
}) {
  const { data } = await http.get<ApiResponse<DynamicFeedResponse>>('/feed/dynamic', {
    params,
  });
  return data.data;
}

export async function getSidebarLive() {
  const { data } = await http.get<ApiResponse<{ list: SidebarLiveItem[] }>>('/feed/sidebar/live');
  return data.data;
}

export async function getSidebarOverview() {
  const { data } = await http.get<ApiResponse<DynamicSidebarOverview>>('/feed/sidebar/overview');
  return data.data;
}

export async function getRecentUpdates() {
  const { data } = await http.get<ApiResponse<{ list: SidebarRecentUpdateItem[] }>>(
    '/feed/sidebar/recent-updates',
  );
  return data.data;
}

export async function getRecommendedUsers() {
  const { data } = await http.get<ApiResponse<{ list: SidebarRecommendedUser[] }>>(
    '/feed/sidebar/recommended-users',
  );
  return data.data;
}

export async function createDynamicPost(payload: { content: string; images?: string[] }) {
  const { data } = await http.post<ApiResponse<DynamicPostItem>>('/feed/posts', payload);
  return data.data;
}

export async function likeDynamicPost(postId: number) {
  const { data } = await http.post<ApiResponse<DynamicPostLikeResult>>(`/feed/posts/${postId}/like`);
  return data.data;
}

export async function unlikeDynamicPost(postId: number) {
  const { data } = await http.delete<ApiResponse<DynamicPostLikeResult>>(`/feed/posts/${postId}/like`);
  return data.data;
}

export async function fetchDynamicPostComments(postId: number) {
  const { data } = await http.get<ApiResponse<DynamicPostCommentList>>(`/feed/posts/${postId}/comments`);
  return data.data;
}

export async function createDynamicPostComment(postId: number, content: string) {
  const { data } = await http.post<ApiResponse<DynamicPostCommentItem>>(`/feed/posts/${postId}/comments`, {
    content,
  });
  return data.data;
}

export async function uploadDynamicPostImage(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await http.post<ApiResponse<{ url: string }>>('/feed/posts/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
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
