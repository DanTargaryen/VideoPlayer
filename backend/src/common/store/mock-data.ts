import type { MockReviewRecord, MockUser, MockVideo } from '../types/mock-data';

const now = new Date().toISOString();

export const mockUsers: MockUser[] = [
  {
    id: 1,
    username: 'demo_admin',
    email: 'admin@guanlan.dev',
    password: 'admin123',
    role: 'ADMIN',
    nickname: '平台管理员',
  },
  {
    id: 2,
    username: 'demo_creator',
    email: 'creator@guanlan.dev',
    password: 'creator123',
    role: 'USER',
    nickname: '投稿用户',
  },
  {
    id: 3,
    username: 'demo_user',
    email: 'user@guanlan.dev',
    password: 'user123',
    role: 'USER',
    nickname: '演示用户',
  },
];

export const mockVideos: MockVideo[] = [
  {
    id: 1,
    creatorId: 2,
    title: '观澜视频平台演示视频',
    description: '这是一个已发布的视频，用于展示首页推荐和详情页。',
    categoryId: 1,
    coverUrl: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=800&q=80',
    playUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    status: 'PUBLISHED',
    uploadToken: 'seed-published-token',
    publishedAt: now,
    likeCount: 18,
    favoriteCount: 7,
    commentCount: 3,
  },
];

export const mockReviews: MockReviewRecord[] = [];

export let nextVideoId = 2;
export let nextReviewId = 1;

export function allocateVideoId() {
  return nextVideoId++;
}

export function allocateReviewId() {
  return nextReviewId++;
}
