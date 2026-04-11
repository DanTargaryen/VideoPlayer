export type UserRole = 'USER' | 'ADMIN';
export type VideoStatus = 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'REJECTED';

export interface MockUser {
  id: number;
  username: string;
  email: string;
  password: string;
  role: UserRole;
  nickname: string;
}

export interface MockVideo {
  id: number;
  creatorId: number;
  title: string;
  description: string;
  categoryId: number;
  coverUrl: string;
  playUrl: string;
  status: VideoStatus;
  uploadToken: string;
  rejectReason?: string;
  submittedAt?: string;
  publishedAt?: string;
  likeCount: number;
  favoriteCount: number;
  commentCount: number;
}

export interface MockReviewRecord {
  id: number;
  videoId: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reason?: string;
  reviewerId?: number;
  createdAt: string;
  reviewedAt?: string;
}
