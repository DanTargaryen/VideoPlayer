import { randomUUID } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

import {
  authorizeServiceRequest,
  failure,
  issueServiceToken,
  ok,
  type ApiResponse,
  type IdentityUserSummaryContract,
  type ServiceRuntimeOptions,
  type ServiceStatus,
  type ServiceVersion,
} from '@videoplayer/shared-contracts';

import {
  GovernanceReviewError,
  HttpGovernanceReviewClient,
  type GovernanceReviewClient,
} from './governance-client.js';
import {
  HttpIdentityNotificationClient,
  type ContentNotification,
  type IdentityNotificationClient,
} from './notification-client.js';

export const SERVICE_OPTIONS: ServiceRuntimeOptions = {
  serviceName: 'content-media',
  defaultPort: 3102,
};

type VideoStatus = 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'REJECTED' | 'HIDDEN';
type AssetKind = 'ORIGINAL' | 'TRANSCODED' | 'COVER' | 'REPLAY';
type TextTargetType = 'COMMENT' | 'DANMAKU';
type TextStatus = 'VISIBLE' | 'HIDDEN' | 'DELETED';

type ContentPrincipal = {
  id: string;
  nickname: string;
  role: string;
  isAdmin: boolean;
};

type CreatorSummary = Omit<IdentityUserSummaryContract, 'id'> & {
  id: string;
  unavailable?: boolean;
};

interface VideoRecord {
  id: string;
  title: string;
  description: string;
  creatorId: string;
  categoryId: string | null;
  legacyCategory?: string | null;
  status: VideoStatus;
  coverUrl: string | null;
  playUrl: string | null;
  durationSeconds: number;
  publishedAt: string | null;
  submittedAt: string | null;
  reviewSubmissionRequestId: string | null;
  rejectReason: string | null;
  tags: string[];
  playCount: number;
  likeCount: number;
  favoriteCount: number;
  commentCount: number;
  coinCount: number;
  createdAt: string;
  categoryCode: string | null;
  categoryName: string | null;
}

interface VideoAssetRecord {
  id: string;
  videoId: string;
  kind: AssetKind;
  objectKey: string;
  requestId?: string | null;
  bucket: string;
  mimeType: string;
  url: string;
}

interface CommentRecord {
  id: string;
  videoId: string;
  userId: string;
  parentId: string | null;
  rootId: string | null;
  body: string;
  imageUrl: string | null;
  status: TextStatus;
  replyCount: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface DanmakuRecord {
  id: string;
  videoId: string;
  userId: string;
  body: string;
  timeOffsetMs: number;
  color: string;
  status: TextStatus;
  createdAt: string | Date;
}

type FavoriteFolderRecord = {
  id: string;
  userId: string;
  name: string;
  isDefault: boolean;
  videoCount: number;
  createdAt: string | Date;
  updatedAt: string | Date;
};

type NotificationOutboxRecord = ContentNotification & {
  id: string;
  attempts: number;
};

interface ReviewDecisionRecord {
  decisionId: string;
  videoId: string;
  decision: 'APPROVED' | 'REJECTED' | 'HIDDEN';
  appliedStatus: VideoStatus;
  reason: string | null;
}

interface ReplayRecord {
  requestId: string;
  objectKey: string;
  mimeType: 'video/webm' | 'video/mp4';
  contentVideoId: string;
  assetId: string;
  title: string;
  creatorId: string;
}

export interface ContentState {
  videos: VideoRecord[];
  assets: VideoAssetRecord[];
  comments: CommentRecord[];
  danmaku: DanmakuRecord[];
  likes: Array<{ id: string; videoId: string; userId: string }>;
  favoriteFolders: Array<{ id: string; userId: string; name: string; isDefault: boolean; createdAt: string; updatedAt: string }>;
  favorites: Array<{ id: string; videoId: string; userId: string; folderId: string }>;
  watches: Array<{ id: string; videoId: string; userId: string; playCount: number; totalWatchDurationSeconds: number; lastWatchDurationSeconds: number; videoDurationSeconds: number; maxWatchRatio: number; lastWatchRatio: number; completedCount: number; lastWatchedAt: string | null }>;
  writeReceipts: Array<{ requestId: string; operation: string; actorId: string | null; resourceId: string; payload: unknown; result: unknown }>;
  notificationOutbox: Array<NotificationOutboxRecord & { status: 'PENDING' | 'DELIVERED' | 'FAILED'; lastError: string | null; nextRetryAt: string }>;
  reviewDecisions: ReviewDecisionRecord[];
  replays: ReplayRecord[];
  deletedObjects: string[];
}

export interface IdentityBatchClient {
  batchSummary(userIds: string[], requestId: string): Promise<Map<string, CreatorSummary>>;
}

export interface ContentServiceOptions {
  identityClient?: IdentityBatchClient;
  governanceClient?: GovernanceReviewClient | null;
  notificationClient?: IdentityNotificationClient | null;
  internalJwtSecret?: string;
  identityTimeoutMs?: number;
  governanceTimeoutMs?: number;
  state?: ContentState;
  repository?: ContentRepository;
}

export interface MediaCandidate {
  filename: string;
  mimeType: string;
  bytes: Uint8Array;
  objectKey?: string;
}

export interface VideoStreamProbe {
  probe(candidate: MediaCandidate): Promise<{ ok: true } | { ok: false; reason: string }>;
}

export interface ObjectDeletionStore {
  deleteObject(bucket: string, objectKey: string): Promise<void>;
}

const DEFAULT_IDENTITY_TIMEOUT_MS = 1000;

class ContentHttpError extends Error {
  constructor(readonly status: 400 | 401 | 403 | 404 | 409 | 503, message: string) {
    super(message);
    this.name = 'ContentHttpError';
  }
}

interface SearchResult {
  keyword: string;
  tab: 'video' | 'live' | 'user';
  sortBy: 'best' | 'hot' | 'latest';
  categoryCode: string;
  page: number;
  pageSize: number;
  counts: { video: number; user: number; live: number };
  video: VideoRecord[];
  live: unknown[];
  user: unknown[];
  category: { code: string; label: string } | null;
}

type ModerationTargetType = 'VIDEO' | 'COMMENT' | 'VIDEO_DANMAKU';
type ModerationTargetSnapshot = {
  targetType: ModerationTargetType;
  targetId: string;
  videoId: string;
  status: string;
  title?: string;
  content?: string;
  creatorId?: string;
  description?: string;
  coverUrl?: string | null;
  playUrl?: string | null;
  durationSeconds?: number;
  createdAt?: string | Date;
  publishedAt?: string | Date | null;
  user?: { id: string; nickname: string };
  video?: { id: string; title: string };
};

export interface ContentRepository {
  ready(): Promise<boolean>;
  listRecommended(options: { page: number; pageSize: number; categoryCode?: string }): Promise<VideoRecord[]>;
  search(options: { keyword: string; page: number; pageSize: number; categoryCode?: string; sortBy: 'best' | 'hot' | 'latest' }): Promise<SearchResult>;
  findPublishedVideo(id: string): Promise<VideoRecord | null>;
  listRelated(videoId: string, limit: number): Promise<VideoRecord[] | null>;
  listAssets(videoId: string): Promise<VideoAssetRecord[]>;
  submitReview(input: { videoId: string; userId: string; isAdmin: boolean; requestId: string }): Promise<
    | {
        ok: true;
        replayed: boolean;
        previousStatus: 'DRAFT' | 'REJECTED' | null;
        previousRequestId: string | null;
        previousSubmittedAt: string | Date | null;
      }
    | { ok: false; status: 403 | 404 | 409; message: string }
  >;
  rollbackReviewSubmission(input: {
    videoId: string;
    requestId: string;
    previousStatus: 'DRAFT' | 'REJECTED';
    previousRequestId: string | null;
    previousSubmittedAt: string | Date | null;
  }): Promise<void>;
  applyReviewDecision(input: { videoId: string; decisionId: string; decision: ReviewDecisionRecord['decision']; reason: string | null }): Promise<
    { ok: true; record: ReviewDecisionRecord; replayed: boolean } | { ok: false; status: 400 | 409; message: string }
  >;
  updateTextStatus(input: { videoId: string; targetType: TextTargetType; targetId: string; status: TextStatus }): Promise<
    { ok: true; targetType: TextTargetType; targetId: string; status: TextStatus } | { ok: false; status: 400; message: string }
  >;
  registerReplay(input: { requestId: string; objectKey: string; mimeType: 'video/webm' | 'video/mp4'; title: string; creatorId: string }): Promise<
    { ok: true; record: ReplayRecord; replayed: boolean } | { ok: false; status: 409; message: string }
  >;
  batchSummary(ids: string[]): Promise<Array<{ id: string; found: true; title: string; coverUrl: string | null; status: VideoStatus } | { id: string; found: false }>>;
  moderationTarget(targetType: ModerationTargetType, targetId: string): Promise<ModerationTargetSnapshot | null>;
  viewerState(videoId: string, userId: string): Promise<{ isLiked: boolean; isFavorited: boolean }>;
  listComments(videoId: string): Promise<CommentRecord[]>;
  createComment(input: { videoId: string; principal: ContentPrincipal; body: string; imageUrl: string | null; parentId: string | null; requestId: string }): Promise<CommentRecord>;
  withdrawComment(input: { videoId: string; commentId: string; principal: ContentPrincipal; requestId: string }): Promise<{ withdrawn: true; commentId: string; withdrawnCount: number }>;
  setLike(input: { videoId: string; principal: ContentPrincipal; liked: boolean; requestId: string }): Promise<{ liked: boolean }>;
  setFavorite(input: { videoId: string; principal: ContentPrincipal; folderId: string | null; favorited: boolean; requestId: string }): Promise<{ favorited: boolean; folderId?: string; folderName?: string }>;
  recordPlay(input: { videoId: string; principal: ContentPrincipal | null; videoDurationSeconds: number | null; requestId: string }): Promise<{ videoId: string; playCount: number }>;
  recordWatchProgress(input: { videoId: string; principal: ContentPrincipal; watchedSeconds: number; currentTimeSeconds: number; videoDurationSeconds: number | null; event: 'pause' | 'leave' | 'ended'; requestId: string }): Promise<Record<string, unknown>>;
  listDanmaku(videoId: string, fromMs: number, toMs: number): Promise<DanmakuRecord[]>;
  createDanmaku(input: { videoId: string; principal: ContentPrincipal; body: string; timeOffsetMs: number; color: string; requestId: string }): Promise<DanmakuRecord>;
  listFavoriteFolders(userId: string): Promise<FavoriteFolderRecord[]>;
  createFavoriteFolder(input: { principal: ContentPrincipal; name: string; requestId: string }): Promise<FavoriteFolderRecord>;
  deleteFavoriteFolder(input: { principal: ContentPrincipal; folderId: string; requestId: string }): Promise<{ deleted: true; folderId: string; movedToFolderId: string }>;
  listUserVideos(userId: string, kind: 'favorites' | 'likes' | 'history', folderId?: string): Promise<VideoRecord[]>;
  pendingNotifications(limit: number): Promise<NotificationOutboxRecord[]>;
  markNotificationDelivered(id: string): Promise<void>;
  markNotificationFailed(id: string, error: string, retryable: boolean, attempts: number): Promise<void>;
}

export function createFixtureState(): ContentState {
  return {
    videos: [
      {
        id: '1',
        title: 'Spring Architecture Notes',
        description: 'A published content fixture for recommendation, search and detail contracts.',
        creatorId: '1',
        categoryId: 'cat-backend',
        status: 'PUBLISHED',
        coverUrl: 'https://cdn.example.test/covers/video-001.jpg',
        playUrl: 'https://cdn.example.test/videos/video-001.mp4',
        durationSeconds: 92,
        publishedAt: '2026-08-27T02:00:00.000Z',
        submittedAt: '2026-08-27T01:30:00.000Z',
        reviewSubmissionRequestId: 'fixture-published-review',
        rejectReason: null,
        tags: ['architecture', 'spring'],
        playCount: 410,
        likeCount: 39,
        favoriteCount: 12,
        commentCount: 1,
        coinCount: 0,
        createdAt: '2026-08-27T01:00:00.000Z',
        categoryCode: 'backend',
        categoryName: 'Backend',
      },
      {
        id: '2',
        title: 'Media Pipeline Smoke',
        description: 'Published video used as related recommendation.',
        creatorId: '2',
        categoryId: 'cat-media',
        status: 'PUBLISHED',
        coverUrl: 'https://cdn.example.test/covers/video-002.jpg',
        playUrl: 'https://cdn.example.test/videos/video-002.mp4',
        durationSeconds: 121,
        publishedAt: '2026-08-27T03:00:00.000Z',
        submittedAt: '2026-08-27T02:30:00.000Z',
        reviewSubmissionRequestId: 'fixture-related-review',
        rejectReason: null,
        tags: ['media', 'ffprobe'],
        playCount: 220,
        likeCount: 18,
        favoriteCount: 8,
        commentCount: 0,
        coinCount: 0,
        createdAt: '2026-08-27T01:30:00.000Z',
        categoryCode: 'media',
        categoryName: 'Media',
      },
      {
        id: '3',
        title: 'Draft Upload Is Private',
        description: 'Draft fixture must not leak to public read APIs.',
        creatorId: '1',
        categoryId: 'cat-media',
        status: 'DRAFT',
        coverUrl: null,
        playUrl: null,
        durationSeconds: 0,
        publishedAt: null,
        submittedAt: null,
        reviewSubmissionRequestId: null,
        rejectReason: null,
        tags: ['draft'],
        playCount: 0,
        likeCount: 0,
        favoriteCount: 0,
        commentCount: 0,
        coinCount: 0,
        createdAt: '2026-08-27T01:45:00.000Z',
        categoryCode: 'media',
        categoryName: 'Media',
      },
    ],
    assets: [
      {
        id: 'asset-001',
        videoId: '1',
        kind: 'TRANSCODED',
        objectKey: 'videos/video-001.mp4',
        bucket: 'videoplayer-content',
        mimeType: 'video/mp4',
        url: 'https://cdn.example.test/videos/video-001.mp4',
      },
    ],
    comments: [{
      id: 'comment-001', videoId: '1', userId: '2', parentId: null, rootId: null,
      body: 'clear walkthrough', imageUrl: null, status: 'VISIBLE', replyCount: 0,
      createdAt: '2026-08-27T02:10:00.000Z', updatedAt: '2026-08-27T02:10:00.000Z',
    }],
    danmaku: [{
      id: 'danmaku-001', videoId: '1', userId: '2', body: 'nice', timeOffsetMs: 1_000,
      color: '#FFFFFF', status: 'VISIBLE', createdAt: '2026-08-27T02:10:00.000Z',
    }],
    likes: [],
    favoriteFolders: [],
    favorites: [],
    watches: [],
    writeReceipts: [],
    notificationOutbox: [],
    reviewDecisions: [],
    replays: [],
    deletedObjects: [],
  };
}

export class MockIdentityBatchClient implements IdentityBatchClient {
  private readonly summaries = new Map<string, CreatorSummary>([
    ['1', { id: '1', nickname: 'Creator One', avatarUrl: 'https://cdn.example.test/users/one.png' }],
    ['2', { id: '2', nickname: 'Creator Two', avatarUrl: null }],
  ]);

  async batchSummary(userIds: string[]): Promise<Map<string, CreatorSummary>> {
    return new Map(userIds.map((id) => [id, this.summaries.get(id) ?? fallbackCreatorSummary(id)]));
  }
}

export class HttpIdentityBatchClient implements IdentityBatchClient {
  private readonly baseUrl: string;

  constructor(baseUrl: string, private readonly jwtSecret: string, private readonly timeoutMs = 1_000) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  async batchSummary(userIds: string[], requestId: string): Promise<Map<string, CreatorSummary>> {
    const token = issueServiceToken({
      caller: 'content-media',
      audience: 'identity-community',
      scopes: ['internal:user-summary'],
      secret: this.jwtSecret,
      requestId,
    });
    const response = await fetch(`${this.baseUrl}/internal/v1/users/batch-summary`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', 'x-request-id': requestId },
      body: JSON.stringify({ userIds }),
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!response.ok) throw new Error(`identity batch summary returned ${response.status}`);
    const payload = await response.json() as { data?: { items?: Array<{ id?: unknown; nickname?: unknown; avatarUrl?: unknown }> } };
    const items = Array.isArray(payload.data?.items) ? payload.data.items : [];
    return new Map(items.flatMap((item) => {
      const id = Number(item.id);
      if (!Number.isSafeInteger(id) || typeof item.nickname !== 'string') return [];
      return [[String(id), { id: String(id), nickname: item.nickname, avatarUrl: typeof item.avatarUrl === 'string' ? item.avatarUrl : null }] as const];
    }));
  }
}

class FixtureContentRepository implements ContentRepository {
  constructor(private readonly state: ContentState) {}

  async ready(): Promise<boolean> {
    return true;
  }

  async listRecommended(options: { page: number; pageSize: number; categoryCode?: string }): Promise<VideoRecord[]> {
    const filtered = publishedVideos(this.state).filter((video) => !options.categoryCode || video.categoryCode === options.categoryCode);
    return filtered.sort((left, right) => right.playCount - left.playCount).slice((options.page - 1) * options.pageSize, options.page * options.pageSize);
  }

  async search(options: { keyword: string; page: number; pageSize: number; categoryCode?: string; sortBy: 'best' | 'hot' | 'latest' }): Promise<SearchResult> {
    const videos = publishedVideos(this.state).filter((video) => {
      const matchesKeyword = !options.keyword || `${video.title} ${video.description} ${video.tags.join(' ')}`.toLowerCase().includes(options.keyword.toLowerCase());
      const matchesCategory = !options.categoryCode || video.categoryCode === options.categoryCode;
      return matchesKeyword && matchesCategory;
    });
    const sorted = [...videos].sort((left, right) => {
      if (options.sortBy === 'latest') return String(right.publishedAt ?? '').localeCompare(String(left.publishedAt ?? ''));
      return right.playCount + right.likeCount - (left.playCount + left.likeCount);
    });
    return buildSearchResult(options, sorted.slice((options.page - 1) * options.pageSize, options.page * options.pageSize), videos.length);
  }

  async findPublishedVideo(id: string): Promise<VideoRecord | null> {
    return this.state.videos.find((video) => video.id === id && video.status === 'PUBLISHED') ?? null;
  }

  async listRelated(videoId: string, limit: number): Promise<VideoRecord[] | null> {
    const base = this.state.videos.find((video) => video.id === videoId && video.status === 'PUBLISHED');
    if (!base) return null;
    const related = publishedVideos(this.state).filter((video) => video.id !== base.id && video.categoryId === base.categoryId);
    const fallback = related.length ? related : publishedVideos(this.state).filter((video) => video.id !== base.id);
    return fallback.slice(0, limit);
  }

  async listAssets(videoId: string): Promise<VideoAssetRecord[]> {
    return this.state.assets.filter((asset) => asset.videoId === videoId);
  }

  async submitReview(input: { videoId: string; userId: string; isAdmin: boolean; requestId: string }) {
    const video = this.state.videos.find((item) => item.id === input.videoId);
    if (!video) return { ok: false as const, status: 404 as const, message: 'video not found' };
    if (!input.isAdmin && video.creatorId !== input.userId) {
      return { ok: false as const, status: 403 as const, message: 'only the creator can submit this video for review' };
    }
    if (video.reviewSubmissionRequestId === input.requestId) {
      return {
        ok: true as const,
        replayed: true,
        previousStatus: null,
        previousRequestId: null,
        previousSubmittedAt: null,
      };
    }
    if (this.state.videos.some((item) => item.id !== video.id && item.reviewSubmissionRequestId === input.requestId)) {
      return { ok: false as const, status: 409 as const, message: 'requestId was already used for a different video' };
    }
    if (video.status !== 'DRAFT' && video.status !== 'REJECTED') {
      return { ok: false as const, status: 409 as const, message: 'only draft or rejected videos can be submitted for review' };
    }
    const previousStatus = video.status;
    const previousRequestId = video.reviewSubmissionRequestId;
    const previousSubmittedAt = video.submittedAt;
    video.status = 'PENDING_REVIEW';
    video.reviewSubmissionRequestId = input.requestId;
    video.submittedAt = new Date().toISOString();
    return { ok: true as const, replayed: false, previousStatus, previousRequestId, previousSubmittedAt };
  }

  async rollbackReviewSubmission(input: { videoId: string; requestId: string; previousStatus: 'DRAFT' | 'REJECTED'; previousRequestId: string | null; previousSubmittedAt: string | Date | null }): Promise<void> {
    const video = this.state.videos.find((item) => item.id === input.videoId);
    if (video?.status === 'PENDING_REVIEW' && video.reviewSubmissionRequestId === input.requestId) {
      video.status = input.previousStatus;
      video.reviewSubmissionRequestId = input.previousRequestId;
      video.submittedAt = input.previousSubmittedAt ? new Date(input.previousSubmittedAt).toISOString() : null;
    }
  }

  async applyReviewDecision(input: { videoId: string; decisionId: string; decision: ReviewDecisionRecord['decision']; reason: string | null }): Promise<
    { ok: true; record: ReviewDecisionRecord; replayed: boolean } | { ok: false; status: 400 | 409; message: string }
  > {
    const existing = this.state.reviewDecisions.find((decision) => decision.decisionId === input.decisionId);
    if (existing) {
      return sameReviewDecision(existing, input) ? { ok: true, record: existing, replayed: true } : { ok: false, status: 409, message: 'decisionId conflicts with a different video or decision payload' };
    }
    const video = this.state.videos.find((item) => item.id === input.videoId);
    if (!video) return { ok: false, status: 400, message: 'video, decisionId and decision are required' };
    video.status = input.decision === 'APPROVED' ? 'PUBLISHED' : input.decision === 'HIDDEN' ? 'HIDDEN' : 'REJECTED';
    if (input.decision === 'APPROVED') video.publishedAt ??= new Date().toISOString();
    video.rejectReason = input.decision === 'REJECTED' ? input.reason : null;
    const record: ReviewDecisionRecord = {
      decisionId: input.decisionId,
      videoId: video.id,
      decision: input.decision,
      appliedStatus: video.status,
      reason: input.reason,
    };
    this.state.reviewDecisions.push(record);
    return { ok: true, record, replayed: false };
  }

  async updateTextStatus(input: { videoId: string; targetType: TextTargetType; targetId: string; status: TextStatus }) {
    const collection = input.targetType === 'DANMAKU' ? this.state.danmaku : this.state.comments;
    const target = collection.find((item) => item.id === input.targetId && item.videoId === input.videoId);
    if (!target) return { ok: false as const, status: 400 as const, message: 'target and valid status are required' };
    target.status = input.status;
    return { ok: true as const, targetType: input.targetType, targetId: target.id, status: target.status };
  }

  async registerReplay(input: { requestId: string; objectKey: string; mimeType: 'video/webm' | 'video/mp4'; title: string; creatorId: string }) {
    const existing = this.state.replays.find((replay) => replay.requestId === input.requestId || replay.objectKey === input.objectKey);
    if (existing) {
      return sameReplay(existing, input) ? { ok: true as const, record: existing, replayed: true } : { ok: false as const, status: 409 as const, message: 'replay idempotency key conflicts with a different payload' };
    }
    const sequence = this.state.replays.length + 1;
    const video: VideoRecord = {
      id: String(1000 + sequence),
      title: input.title,
      description: 'Replay registered by live-reward internal API.',
      creatorId: input.creatorId,
      categoryId: 'cat-live',
      status: 'DRAFT',
      coverUrl: null,
      playUrl: `https://cdn.example.test/${input.objectKey}`,
      durationSeconds: 0,
      publishedAt: null,
      submittedAt: null,
      reviewSubmissionRequestId: null,
      rejectReason: null,
      tags: ['replay'],
      playCount: 0,
      likeCount: 0,
      favoriteCount: 0,
      commentCount: 0,
      coinCount: 0,
      createdAt: new Date().toISOString(),
      categoryCode: 'live',
      categoryName: 'Live Replay',
    };
    const asset: VideoAssetRecord = {
      id: `replay-asset-${sequence}`,
      videoId: video.id,
      kind: 'REPLAY',
      objectKey: input.objectKey,
      requestId: input.requestId,
      bucket: 'videoplayer-content',
      mimeType: input.mimeType,
      url: video.playUrl ?? '',
    };
    const replay: ReplayRecord = { ...input, contentVideoId: video.id, assetId: asset.id };
    this.state.videos.push(video);
    this.state.assets.push(asset);
    this.state.replays.push(replay);
    return { ok: true as const, record: replay, replayed: false };
  }

  async batchSummary(ids: string[]) {
    return ids.map((id) => {
      const video = this.state.videos.find((item) => item.id === id && item.status === 'PUBLISHED');
      return video ? { id, found: true as const, title: video.title, coverUrl: video.coverUrl, status: video.status } : { id, found: false as const };
    });
  }

  async moderationTarget(targetType: ModerationTargetType, targetId: string): Promise<ModerationTargetSnapshot | null> {
    if (targetType === 'VIDEO') {
      const video = this.state.videos.find((item) => item.id === targetId);
      return video ? { ...video, targetType, targetId, videoId: video.id } : null;
    }
    const collection = targetType === 'COMMENT' ? this.state.comments : this.state.danmaku;
    const item = collection.find((entry) => entry.id === targetId);
    if (!item) return null;
    const video = this.state.videos.find((entry) => entry.id === item.videoId);
    return { targetType, targetId, videoId: item.videoId, content: item.body, status: item.status, user: { id: item.userId, nickname: `用户#${item.userId}` }, video: video ? { id: video.id, title: video.title } : { id: item.videoId, title: '' } };
  }

  private async withReceipt<T>(input: { requestId: string; operation: string; actorId: string | null; resourceId: string; payload: unknown }, action: () => T | Promise<T>): Promise<T> {
    const existing = this.state.writeReceipts.find((item) => item.requestId === input.requestId);
    if (existing) {
      if (existing.operation !== input.operation || existing.actorId !== input.actorId || existing.resourceId !== input.resourceId || canonicalJson(existing.payload) !== canonicalJson(input.payload)) {
        throw new ContentHttpError(409, 'requestId conflicts with a different content write');
      }
      return existing.result as T;
    }
    const result = await action();
    this.state.writeReceipts.push({ ...input, result });
    return result;
  }

  private requirePublished(videoId: string): VideoRecord {
    const video = this.state.videos.find((item) => item.id === videoId && item.status === 'PUBLISHED');
    if (!video) throw new ContentHttpError(404, 'video not found');
    return video;
  }

  private ensureDefaultFolder(userId: string) {
    let folder = this.state.favoriteFolders.find((item) => item.userId === userId && item.isDefault);
    if (!folder) {
      const now = new Date().toISOString();
      folder = { id: `folder-${randomUUID()}`, userId, name: '默认收藏夹', isDefault: true, createdAt: now, updatedAt: now };
      this.state.favoriteFolders.push(folder);
    }
    return folder;
  }

  private enqueueNotification(notification: ContentNotification) {
    if (this.state.notificationOutbox.some((item) => item.requestId === notification.requestId)) return;
    this.state.notificationOutbox.push({
      id: `outbox-${randomUUID()}`,
      ...notification,
      attempts: 0,
      status: 'PENDING',
      lastError: null,
      nextRetryAt: new Date().toISOString(),
    });
  }

  async viewerState(videoId: string, userId: string) {
    return {
      isLiked: this.state.likes.some((item) => item.videoId === videoId && item.userId === userId),
      isFavorited: this.state.favorites.some((item) => item.videoId === videoId && item.userId === userId),
    };
  }

  async listComments(videoId: string) {
    return this.state.comments.filter((item) => item.videoId === videoId && item.status === 'VISIBLE');
  }

  async createComment(input: { videoId: string; principal: ContentPrincipal; body: string; imageUrl: string | null; parentId: string | null; requestId: string }) {
    return this.withReceipt({ requestId: input.requestId, operation: 'comment.create', actorId: input.principal.id, resourceId: input.videoId, payload: { body: input.body, imageUrl: input.imageUrl, parentId: input.parentId } }, () => {
      const video = this.requirePublished(input.videoId);
      const parent = input.parentId ? this.state.comments.find((item) => item.id === input.parentId && item.videoId === input.videoId && item.status === 'VISIBLE') : null;
      if (input.parentId && !parent) throw new ContentHttpError(404, 'parent comment not found');
      const now = new Date().toISOString();
      const comment: CommentRecord = {
        id: `comment-${randomUUID()}`,
        videoId: input.videoId,
        userId: input.principal.id,
        parentId: parent?.id ?? null,
        rootId: parent ? parent.rootId ?? parent.id : null,
        body: input.body,
        imageUrl: input.imageUrl,
        status: 'VISIBLE',
        replyCount: 0,
        createdAt: now,
        updatedAt: now,
      };
      this.state.comments.push(comment);
      video.commentCount += 1;
      if (parent) parent.replyCount += 1;
      const recipientId = parent?.userId ?? video.creatorId;
      if (recipientId !== input.principal.id) {
        this.enqueueNotification({
          requestId: `${input.requestId}:notification`.slice(0, 128),
          recipientId,
          actorId: input.principal.id,
          type: parent ? 'REPLY' : 'COMMENT',
          title: parent ? '收到新的回复' : '收到新的评论',
          content: `${input.principal.nickname}：${(input.body || '[图片评论]').slice(0, 80)}`,
          relatedType: 'VIDEO',
          relatedId: input.videoId,
        });
      }
      return comment;
    });
  }

  async withdrawComment(input: { videoId: string; commentId: string; principal: ContentPrincipal; requestId: string }) {
    return this.withReceipt({ requestId: input.requestId, operation: 'comment.withdraw', actorId: input.principal.id, resourceId: input.commentId, payload: { videoId: input.videoId } }, () => {
      const comment = this.state.comments.find((item) => item.id === input.commentId && item.videoId === input.videoId && item.status === 'VISIBLE');
      if (!comment) throw new ContentHttpError(404, 'comment not found');
      if (comment.userId !== input.principal.id && !input.principal.isAdmin) throw new ContentHttpError(403, 'cannot withdraw others comments');
      const ids = new Set<string>([comment.id]);
      let changed = true;
      while (changed) {
        changed = false;
        for (const item of this.state.comments) {
          if (item.parentId && ids.has(item.parentId) && item.status === 'VISIBLE' && !ids.has(item.id)) {
            ids.add(item.id);
            changed = true;
          }
        }
      }
      for (const item of this.state.comments) if (ids.has(item.id)) item.status = 'DELETED';
      const video = this.state.videos.find((item) => item.id === input.videoId);
      if (video) video.commentCount = Math.max(0, video.commentCount - ids.size);
      const parent = comment.parentId ? this.state.comments.find((item) => item.id === comment.parentId) : null;
      if (parent) parent.replyCount = Math.max(0, parent.replyCount - 1);
      return { withdrawn: true as const, commentId: comment.id, withdrawnCount: ids.size };
    });
  }

  async setLike(input: { videoId: string; principal: ContentPrincipal; liked: boolean; requestId: string }) {
    return this.withReceipt({ requestId: input.requestId, operation: input.liked ? 'video.like' : 'video.unlike', actorId: input.principal.id, resourceId: input.videoId, payload: {} }, () => {
      const video = this.requirePublished(input.videoId);
      const index = this.state.likes.findIndex((item) => item.videoId === input.videoId && item.userId === input.principal.id);
      if (input.liked && index < 0) {
        this.state.likes.push({ id: `like-${randomUUID()}`, videoId: input.videoId, userId: input.principal.id });
        video.likeCount += 1;
        if (video.creatorId !== input.principal.id) this.enqueueNotification({ requestId: `${input.requestId}:notification`.slice(0, 128), recipientId: video.creatorId, actorId: input.principal.id, type: 'LIKE', title: '收到新的点赞', content: `${input.principal.nickname} 点赞了你的视频`, relatedType: 'VIDEO', relatedId: input.videoId });
      }
      if (!input.liked && index >= 0) {
        this.state.likes.splice(index, 1);
        video.likeCount = Math.max(0, video.likeCount - 1);
      }
      return { liked: input.liked };
    });
  }

  async setFavorite(input: { videoId: string; principal: ContentPrincipal; folderId: string | null; favorited: boolean; requestId: string }) {
    return this.withReceipt({ requestId: input.requestId, operation: input.favorited ? 'video.favorite' : 'video.unfavorite', actorId: input.principal.id, resourceId: input.videoId, payload: { folderId: input.folderId } }, () => {
      const video = this.requirePublished(input.videoId);
      const existing = this.state.favorites.find((item) => item.videoId === input.videoId && item.userId === input.principal.id);
      if (!input.favorited) {
        if (existing) {
          this.state.favorites.splice(this.state.favorites.indexOf(existing), 1);
          video.favoriteCount = Math.max(0, video.favoriteCount - 1);
        }
        return { favorited: false };
      }
      const defaultFolder = this.ensureDefaultFolder(input.principal.id);
      const folder = input.folderId
        ? this.state.favoriteFolders.find((item) => item.id === input.folderId && item.userId === input.principal.id)
        : defaultFolder;
      if (!folder) throw new ContentHttpError(404, 'favorite folder not found');
      if (!existing) {
        this.state.favorites.push({ id: `favorite-${randomUUID()}`, videoId: input.videoId, userId: input.principal.id, folderId: folder.id });
        video.favoriteCount += 1;
        if (video.creatorId !== input.principal.id) this.enqueueNotification({ requestId: `${input.requestId}:notification`.slice(0, 128), recipientId: video.creatorId, actorId: input.principal.id, type: 'FAVORITE', title: '收到新的收藏', content: `${input.principal.nickname} 收藏了你的视频`, relatedType: 'VIDEO', relatedId: input.videoId });
      } else {
        existing.folderId = folder.id;
      }
      return { favorited: true, folderId: folder.id, folderName: folder.name };
    });
  }

  async recordPlay(input: { videoId: string; principal: ContentPrincipal | null; videoDurationSeconds: number | null; requestId: string }) {
    return this.withReceipt({ requestId: input.requestId, operation: 'video.play', actorId: input.principal?.id ?? null, resourceId: input.videoId, payload: { videoDurationSeconds: input.videoDurationSeconds } }, () => {
      const video = this.requirePublished(input.videoId);
      video.playCount += 1;
      if (input.principal) {
        let watch = this.state.watches.find((item) => item.videoId === input.videoId && item.userId === input.principal?.id);
        if (!watch) {
          watch = { id: `watch-${randomUUID()}`, videoId: input.videoId, userId: input.principal.id, playCount: 0, totalWatchDurationSeconds: 0, lastWatchDurationSeconds: 0, videoDurationSeconds: 0, maxWatchRatio: 0, lastWatchRatio: 0, completedCount: 0, lastWatchedAt: null };
          this.state.watches.push(watch);
        }
        watch.playCount += 1;
        watch.videoDurationSeconds = Math.max(watch.videoDurationSeconds, input.videoDurationSeconds ?? 0, video.durationSeconds);
        watch.lastWatchedAt = new Date().toISOString();
      }
      return { videoId: input.videoId, playCount: video.playCount };
    });
  }

  async recordWatchProgress(input: { videoId: string; principal: ContentPrincipal; watchedSeconds: number; currentTimeSeconds: number; videoDurationSeconds: number | null; event: 'pause' | 'leave' | 'ended'; requestId: string }) {
    return this.withReceipt({ requestId: input.requestId, operation: 'video.watch-progress', actorId: input.principal.id, resourceId: input.videoId, payload: { watchedSeconds: input.watchedSeconds, currentTimeSeconds: input.currentTimeSeconds, videoDurationSeconds: input.videoDurationSeconds, event: input.event } }, () => {
      const video = this.requirePublished(input.videoId);
      let watch = this.state.watches.find((item) => item.videoId === input.videoId && item.userId === input.principal.id);
      if (!watch) {
        watch = { id: `watch-${randomUUID()}`, videoId: input.videoId, userId: input.principal.id, playCount: 0, totalWatchDurationSeconds: 0, lastWatchDurationSeconds: 0, videoDurationSeconds: 0, maxWatchRatio: 0, lastWatchRatio: 0, completedCount: 0, lastWatchedAt: null };
        this.state.watches.push(watch);
      }
      const duration = Math.max(video.durationSeconds, input.videoDurationSeconds ?? 0, watch.videoDurationSeconds);
      const current = duration > 0 ? Math.min(input.currentTimeSeconds, duration) : input.currentTimeSeconds;
      const ratio = duration > 0 ? Math.min(1, current / duration) : 0;
      const completed = (input.event === 'ended' || ratio >= 0.9) && watch.maxWatchRatio < 0.9;
      watch.totalWatchDurationSeconds += Math.min(input.watchedSeconds, 7_200);
      watch.lastWatchDurationSeconds = current;
      watch.videoDurationSeconds = duration;
      watch.lastWatchRatio = ratio;
      watch.maxWatchRatio = Math.max(watch.maxWatchRatio, ratio);
      if (completed) watch.completedCount += 1;
      watch.lastWatchedAt = new Date().toISOString();
      return { ...watch, progressSeconds: current, completed: watch.completedCount > 0 };
    });
  }

  async listDanmaku(videoId: string, fromMs: number, toMs: number) {
    return this.state.danmaku.filter((item) => item.videoId === videoId && item.status === 'VISIBLE' && item.timeOffsetMs >= fromMs && item.timeOffsetMs <= toMs);
  }

  async createDanmaku(input: { videoId: string; principal: ContentPrincipal; body: string; timeOffsetMs: number; color: string; requestId: string }) {
    return this.withReceipt({ requestId: input.requestId, operation: 'danmaku.create', actorId: input.principal.id, resourceId: input.videoId, payload: { body: input.body, timeOffsetMs: input.timeOffsetMs, color: input.color } }, () => {
      this.requirePublished(input.videoId);
      const item: DanmakuRecord = { id: `danmaku-${randomUUID()}`, videoId: input.videoId, userId: input.principal.id, body: input.body, timeOffsetMs: input.timeOffsetMs, color: input.color, status: 'VISIBLE', createdAt: new Date().toISOString() };
      this.state.danmaku.push(item);
      return item;
    });
  }

  async listFavoriteFolders(userId: string) {
    this.ensureDefaultFolder(userId);
    return this.state.favoriteFolders.filter((item) => item.userId === userId).map((item) => ({ ...item, videoCount: this.state.favorites.filter((favorite) => favorite.folderId === item.id).length }));
  }

  async createFavoriteFolder(input: { principal: ContentPrincipal; name: string; requestId: string }) {
    return this.withReceipt({ requestId: input.requestId, operation: 'favorite-folder.create', actorId: input.principal.id, resourceId: input.principal.id, payload: { name: input.name } }, () => {
      const name = input.name.trim();
      if (!name || name.length > 64 || name === '默认收藏夹') throw new ContentHttpError(400, 'invalid favorite folder name');
      this.ensureDefaultFolder(input.principal.id);
      if (this.state.favoriteFolders.some((item) => item.userId === input.principal.id && item.name === name)) throw new ContentHttpError(409, 'favorite folder name already exists');
      const now = new Date().toISOString();
      const folder = { id: `folder-${randomUUID()}`, userId: input.principal.id, name, isDefault: false, createdAt: now, updatedAt: now };
      this.state.favoriteFolders.push(folder);
      return { ...folder, videoCount: 0 };
    });
  }

  async deleteFavoriteFolder(input: { principal: ContentPrincipal; folderId: string; requestId: string }) {
    return this.withReceipt({ requestId: input.requestId, operation: 'favorite-folder.delete', actorId: input.principal.id, resourceId: input.folderId, payload: {} }, () => {
      const defaultFolder = this.ensureDefaultFolder(input.principal.id);
      const folder = this.state.favoriteFolders.find((item) => item.id === input.folderId && item.userId === input.principal.id);
      if (!folder) throw new ContentHttpError(404, 'favorite folder not found');
      if (folder.isDefault) throw new ContentHttpError(400, 'default favorite folder cannot be deleted');
      for (const favorite of this.state.favorites) if (favorite.folderId === folder.id) favorite.folderId = defaultFolder.id;
      this.state.favoriteFolders.splice(this.state.favoriteFolders.indexOf(folder), 1);
      return { deleted: true as const, folderId: folder.id, movedToFolderId: defaultFolder.id };
    });
  }

  async listUserVideos(userId: string, kind: 'favorites' | 'likes' | 'history', folderId?: string) {
    if (kind === 'favorites') {
      const targetFolder = folderId ?? this.ensureDefaultFolder(userId).id;
      const ids = new Set(this.state.favorites.filter((item) => item.userId === userId && item.folderId === targetFolder).map((item) => item.videoId));
      return publishedVideos(this.state).filter((video) => ids.has(video.id));
    }
    if (kind === 'likes') {
      const ids = new Set(this.state.likes.filter((item) => item.userId === userId).map((item) => item.videoId));
      return publishedVideos(this.state).filter((video) => ids.has(video.id));
    }
    const ids = new Set(this.state.watches.filter((item) => item.userId === userId).map((item) => item.videoId));
    return publishedVideos(this.state).filter((video) => ids.has(video.id));
  }

  async pendingNotifications(limit: number) {
    const now = Date.now();
    return this.state.notificationOutbox.filter((item) => item.status === 'PENDING' && Date.parse(item.nextRetryAt) <= now).slice(0, limit);
  }

  async markNotificationDelivered(id: string) {
    const item = this.state.notificationOutbox.find((entry) => entry.id === id);
    if (item) item.status = 'DELIVERED';
  }

  async markNotificationFailed(id: string, error: string, retryable: boolean, attempts: number) {
    const item = this.state.notificationOutbox.find((entry) => entry.id === id);
    if (!item) return;
    item.attempts = attempts;
    item.lastError = error;
    item.status = retryable && attempts < 5 ? 'PENDING' : 'FAILED';
    item.nextRetryAt = new Date(Date.now() + Math.min(60_000, 1_000 * 2 ** attempts)).toISOString();
  }
}

type RawVideo = {
  id: string;
  title: string;
  description: string;
  creatorId: string;
  categoryId: string | null;
  legacyCategory: string | null;
  status: VideoStatus;
  coverUrl: string | null;
  playUrl: string | null;
  durationSeconds: number;
  tags: unknown;
  publishedAt: Date | string | null;
  submittedAt: Date | string | null;
  reviewSubmissionRequestId: string | null;
  rejectReason: string | null;
  createdAt: Date | string;
  categoryCode: string | null;
  categoryName: string | null;
  playCount: bigint | number | null;
  likeCount: bigint | number | null;
  favoriteCount: bigint | number | null;
  commentCount: bigint | number | null;
  coinCount: bigint | number | null;
};

interface PrismaLike {
  $queryRawUnsafe<T = unknown>(query: string, ...values: Array<string | number | Date | null>): Promise<T>;
  $executeRawUnsafe(query: string, ...values: Array<string | number | Date | null>): Promise<number>;
  $transaction<T>(callback: (transaction: PrismaLike) => Promise<T>): Promise<T>;
}

class PrismaContentRepository implements ContentRepository {
  private prisma: PrismaLike | undefined;

  private async client(): Promise<PrismaLike> {
    if (!this.prisma) {
      const module = (await import('../generated/prisma-client/index.js')) as unknown as { PrismaClient: new () => PrismaLike };
      this.prisma = new module.PrismaClient();
    }
    return this.prisma;
  }

  private async receipt<T>(client: PrismaLike, requestId: string) {
    const rows = await client.$queryRawUnsafe<Array<{
      operation: string;
      actorId: string | null;
      resourceId: string;
      payload: unknown;
      result: unknown;
    }>>('SELECT operation, actorId, resourceId, payload, result FROM `ContentWriteReceipt` WHERE requestId = ? LIMIT 1', requestId);
    return rows[0] as ({ operation: string; actorId: string | null; resourceId: string; payload: unknown; result: T } | undefined);
  }

  private matchingReceipt<T>(existing: { operation: string; actorId: string | null; resourceId: string; payload: unknown; result: T }, input: { operation: string; actorId: string | null; resourceId: string; payload: unknown }): T {
    if (existing.operation !== input.operation || existing.actorId !== input.actorId || existing.resourceId !== input.resourceId || canonicalJson(existing.payload) !== canonicalJson(input.payload)) {
      throw new ContentHttpError(409, 'requestId conflicts with a different content write');
    }
    return existing.result;
  }

  private async withReceipt<T>(input: { requestId: string; operation: string; actorId: string | null; resourceId: string; payload: unknown }, action: (transaction: PrismaLike) => Promise<T>): Promise<T> {
    const client = await this.client();
    const existing = await this.receipt<T>(client, input.requestId);
    if (existing) return this.matchingReceipt(existing, input);
    try {
      return await client.$transaction(async (transaction) => {
        const inside = await this.receipt<T>(transaction, input.requestId);
        if (inside) return this.matchingReceipt(inside, input);
        const result = await action(transaction);
        await transaction.$executeRawUnsafe(
          'INSERT INTO `ContentWriteReceipt` (requestId, operation, actorId, resourceId, payload, result, createdAt) VALUES (?, ?, ?, ?, CAST(? AS JSON), CAST(? AS JSON), NOW(3))',
          input.requestId,
          input.operation,
          input.actorId,
          input.resourceId,
          canonicalJson(input.payload),
          JSON.stringify(result),
        );
        return result;
      });
    } catch (error) {
      const winner = await this.receipt<T>(client, input.requestId);
      if (winner) return this.matchingReceipt(winner, input);
      throw error;
    }
  }

  private async requirePublished(client: PrismaLike, videoId: string) {
    const rows = await client.$queryRawUnsafe<Array<{
      id: string;
      creatorId: string;
      durationSeconds: number;
      playCount: number;
      likeCount: number;
      favoriteCount: number;
      commentCount: number;
    }>>('SELECT id, creatorId, durationSeconds, playCount, likeCount, favoriteCount, commentCount FROM `Video` WHERE id = ? AND status = \'PUBLISHED\' LIMIT 1', videoId);
    if (!rows[0]) throw new ContentHttpError(404, 'video not found');
    return rows[0];
  }

  private async ensureDefaultFolder(client: PrismaLike, userId: string) {
    const existing = await client.$queryRawUnsafe<Array<{ id: string; name: string; isDefault: number | boolean; createdAt: Date; updatedAt: Date }>>(
      'SELECT id, name, isDefault, createdAt, updatedAt FROM `FavoriteFolder` WHERE userId = ? AND isDefault = true ORDER BY createdAt ASC LIMIT 1',
      userId,
    );
    if (existing[0]) return existing[0];
    const id = `folder-${randomUUID()}`;
    await client.$executeRawUnsafe(
      'INSERT IGNORE INTO `FavoriteFolder` (id, userId, name, isDefault, createdAt, updatedAt) VALUES (?, ?, \'默认收藏夹\', true, NOW(3), NOW(3))',
      id,
      userId,
    );
    const rows = await client.$queryRawUnsafe<Array<{ id: string; name: string; isDefault: number | boolean; createdAt: Date; updatedAt: Date }>>(
      'SELECT id, name, isDefault, createdAt, updatedAt FROM `FavoriteFolder` WHERE userId = ? AND name = \'默认收藏夹\' LIMIT 1',
      userId,
    );
    if (!rows[0]) throw new Error('failed to create default favorite folder');
    await client.$executeRawUnsafe('UPDATE `FavoriteFolder` SET isDefault = true WHERE id = ?', rows[0].id);
    return { ...rows[0], isDefault: true };
  }

  private async enqueueNotification(client: PrismaLike, notification: ContentNotification) {
    await client.$executeRawUnsafe(
      `INSERT IGNORE INTO \`NotificationOutbox\`
        (id, requestId, recipientId, actorId, type, title, content, relatedType, relatedId, status, attempts, nextRetryAt, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', 0, NOW(3), NOW(3), NOW(3))`,
      `outbox-${randomUUID()}`,
      notification.requestId,
      notification.recipientId,
      notification.actorId,
      notification.type,
      notification.title,
      notification.content,
      notification.relatedType,
      notification.relatedId,
    );
  }

  async ready(): Promise<boolean> {
    try {
      await (await this.client()).$queryRawUnsafe('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  async listRecommended(options: { page: number; pageSize: number; categoryCode?: string }): Promise<VideoRecord[]> {
    const whereCategory = options.categoryCode ? 'AND (c.`code` = ? OR JSON_CONTAINS(v.tags, JSON_QUOTE(?)))' : '';
    const params = options.categoryCode ? [options.categoryCode, options.categoryCode, offset(options), options.pageSize] : [offset(options), options.pageSize];
    const rows = await (await this.client()).$queryRawUnsafe<RawVideo[]>(`${videoSelect()} WHERE v.status = 'PUBLISHED' ${whereCategory} ORDER BY playCount DESC, v.publishedAt DESC LIMIT ?, ?`, ...params);
    return rows.map(rawVideo);
  }

  async search(options: { keyword: string; page: number; pageSize: number; categoryCode?: string; sortBy: 'best' | 'hot' | 'latest' }): Promise<SearchResult> {
    const clauses = ["v.status = 'PUBLISHED'"];
    const params: Array<string | number> = [];
    if (options.keyword) {
      clauses.push("(v.title LIKE ? OR v.description LIKE ?)");
      params.push(`%${options.keyword}%`, `%${options.keyword}%`);
    }
    if (options.categoryCode) {
      clauses.push('(c.`code` = ? OR JSON_CONTAINS(v.tags, JSON_QUOTE(?)))');
      params.push(options.categoryCode, options.categoryCode);
    }
    const where = `WHERE ${clauses.join(' AND ')}`;
    const countRows = await (await this.client()).$queryRawUnsafe<Array<{ total: bigint | number }>>(`${videoCountSelect()} ${where}`, ...params);
    const orderBy = options.sortBy === 'latest' ? 'v.publishedAt DESC' : 'playCount DESC, likeCount DESC, v.publishedAt DESC';
    const rows = await (await this.client()).$queryRawUnsafe<RawVideo[]>(`${videoSelect()} ${where} ORDER BY ${orderBy} LIMIT ?, ?`, ...params, offset(options), options.pageSize);
    return buildSearchResult(options, rows.map(rawVideo), Number(countRows[0]?.total ?? 0));
  }

  async findPublishedVideo(id: string): Promise<VideoRecord | null> {
    const rows = await (await this.client()).$queryRawUnsafe<RawVideo[]>(`${videoSelect()} WHERE v.id = ? AND v.status = 'PUBLISHED' LIMIT 1`, id);
    return rows[0] ? rawVideo(rows[0]) : null;
  }

  async listRelated(videoId: string, limit: number): Promise<VideoRecord[] | null> {
    const base = await this.findPublishedVideo(videoId);
    if (!base) return null;
    const related = await (await this.client()).$queryRawUnsafe<RawVideo[]>(
      `${videoSelect()} WHERE v.status = 'PUBLISHED' AND v.id <> ? AND v.categoryId = ? ORDER BY playCount DESC, v.publishedAt DESC LIMIT ?`,
      videoId,
      base.categoryId,
      limit,
    );
    if (related.length) return related.map(rawVideo);
    const fallback = await (await this.client()).$queryRawUnsafe<RawVideo[]>(`${videoSelect()} WHERE v.status = 'PUBLISHED' AND v.id <> ? ORDER BY playCount DESC, v.publishedAt DESC LIMIT ?`, videoId, limit);
    return fallback.map(rawVideo);
  }

  async listAssets(videoId: string): Promise<VideoAssetRecord[]> {
    return (await this.client()).$queryRawUnsafe<VideoAssetRecord[]>(
      'SELECT id, videoId, kind, bucket, objectKey, requestId, mimeType, url FROM `VideoAsset` WHERE videoId = ? ORDER BY createdAt ASC',
      videoId,
    );
  }

  async submitReview(input: { videoId: string; userId: string; isAdmin: boolean; requestId: string }) {
    const rows = await (await this.client()).$queryRawUnsafe<Array<{
      creatorId: string;
      status: VideoStatus;
      reviewSubmissionRequestId: string | null;
      submittedAt: Date | string | null;
    }>>(
      'SELECT creatorId, status, reviewSubmissionRequestId, submittedAt FROM `Video` WHERE id = ? LIMIT 1',
      input.videoId,
    );
    const video = rows[0];
    if (!video) return { ok: false as const, status: 404 as const, message: 'video not found' };
    if (!input.isAdmin && video.creatorId !== input.userId) {
      return { ok: false as const, status: 403 as const, message: 'only the creator can submit this video for review' };
    }
    if (video.reviewSubmissionRequestId === input.requestId) {
      return {
        ok: true as const,
        replayed: true,
        previousStatus: null,
        previousRequestId: null,
        previousSubmittedAt: null,
      };
    }
    if (video.status !== 'DRAFT' && video.status !== 'REJECTED') {
      return { ok: false as const, status: 409 as const, message: 'only draft or rejected videos can be submitted for review' };
    }
    let updated = 0;
    try {
      updated = input.isAdmin
        ? await (await this.client()).$executeRawUnsafe(
            "UPDATE `Video` SET status = 'PENDING_REVIEW', reviewSubmissionRequestId = ?, submittedAt = NOW(3) WHERE id = ? AND status = ?",
            input.requestId,
            input.videoId,
            video.status,
          )
        : await (await this.client()).$executeRawUnsafe(
            "UPDATE `Video` SET status = 'PENDING_REVIEW', reviewSubmissionRequestId = ?, submittedAt = NOW(3) WHERE id = ? AND creatorId = ? AND status = ?",
            input.requestId,
            input.videoId,
            input.userId,
            video.status,
          );
    } catch {
      const conflicts = await (await this.client()).$queryRawUnsafe<Array<{ id: string }>>(
        'SELECT id FROM `Video` WHERE reviewSubmissionRequestId = ? LIMIT 1',
        input.requestId,
      );
      if (conflicts[0]?.id === input.videoId) {
        return {
          ok: true as const,
          replayed: true,
          previousStatus: null,
          previousRequestId: null,
          previousSubmittedAt: null,
        };
      }
      if (conflicts[0]) return { ok: false as const, status: 409 as const, message: 'requestId was already used for a different video' };
      throw new Error('failed to persist review submission');
    }
    if (updated !== 1) {
      const current = await (await this.client()).$queryRawUnsafe<Array<{ reviewSubmissionRequestId: string | null }>>(
        'SELECT reviewSubmissionRequestId FROM `Video` WHERE id = ? LIMIT 1',
        input.videoId,
      );
      if (current[0]?.reviewSubmissionRequestId === input.requestId) {
        return {
          ok: true as const,
          replayed: true,
          previousStatus: null,
          previousRequestId: null,
          previousSubmittedAt: null,
        };
      }
      return { ok: false as const, status: 409 as const, message: 'video state changed while submitting for review' };
    }
    return {
      ok: true as const,
      replayed: false,
      previousStatus: video.status,
      previousRequestId: video.reviewSubmissionRequestId,
      previousSubmittedAt: video.submittedAt,
    };
  }

  async rollbackReviewSubmission(input: { videoId: string; requestId: string; previousStatus: 'DRAFT' | 'REJECTED'; previousRequestId: string | null; previousSubmittedAt: string | Date | null }): Promise<void> {
    await (await this.client()).$executeRawUnsafe(
      "UPDATE `Video` SET status = ?, reviewSubmissionRequestId = ?, submittedAt = ? WHERE id = ? AND status = 'PENDING_REVIEW' AND reviewSubmissionRequestId = ?",
      input.previousStatus,
      input.previousRequestId,
      input.previousSubmittedAt instanceof Date ? input.previousSubmittedAt : input.previousSubmittedAt ? new Date(input.previousSubmittedAt) : null,
      input.videoId,
      input.requestId,
    );
  }

  async applyReviewDecision(input: { videoId: string; decisionId: string; decision: ReviewDecisionRecord['decision']; reason: string | null }) {
    const existing = await this.findReviewDecision(input.decisionId);
    if (existing) {
      return sameReviewDecision(existing, input) ? { ok: true as const, record: existing, replayed: true } : { ok: false as const, status: 409 as const, message: 'decisionId conflicts with a different video or decision payload' };
    }
    const nextStatus: VideoStatus = input.decision === 'APPROVED' ? 'PUBLISHED' : input.decision === 'HIDDEN' ? 'HIDDEN' : 'REJECTED';
    let updated = 0;
    try {
      const query = input.decision === 'APPROVED'
        ? 'UPDATE `Video` SET status = ?, reviewDecisionId = ?, reviewDecision = ?, reviewDecisionReason = ?, publishedAt = COALESCE(publishedAt, NOW(3)) WHERE id = ?'
        : 'UPDATE `Video` SET status = ?, reviewDecisionId = ?, reviewDecision = ?, reviewDecisionReason = ? WHERE id = ?';
      updated = await (await this.client()).$executeRawUnsafe(query, nextStatus, input.decisionId, input.decision, input.reason, input.videoId);
    } catch {
      const replay = await this.findReviewDecision(input.decisionId);
      if (replay) {
        return sameReviewDecision(replay, input) ? { ok: true as const, record: replay, replayed: true } : { ok: false as const, status: 409 as const, message: 'decisionId conflicts with a different video or decision payload' };
      }
      throw new Error('failed to apply review decision');
    }
    if (updated !== 1) return { ok: false as const, status: 400 as const, message: 'video, decisionId and decision are required' };
    return { ok: true as const, record: { ...input, appliedStatus: nextStatus }, replayed: false };
  }

  async updateTextStatus(input: { videoId: string; targetType: TextTargetType; targetId: string; status: TextStatus }) {
    const table = input.targetType === 'DANMAKU' ? 'VideoDanmaku' : 'Comment';
    const updated = await (await this.client()).$executeRawUnsafe(`UPDATE \`${table}\` SET status = ? WHERE id = ? AND videoId = ?`, input.status, input.targetId, input.videoId);
    if (updated !== 1) return { ok: false as const, status: 400 as const, message: 'target and valid status are required' };
    return { ok: true as const, targetType: input.targetType, targetId: input.targetId, status: input.status };
  }

  async registerReplay(input: { requestId: string; objectKey: string; mimeType: 'video/webm' | 'video/mp4'; title: string; creatorId: string }) {
    const existing = await this.findReplay(input.requestId, input.objectKey);
    if (existing) {
      return sameReplay(existing, input) ? { ok: true as const, record: existing, replayed: true } : { ok: false as const, status: 409 as const, message: 'replay idempotency key conflicts with a different payload' };
    }
    const videoId = randomUUID();
    const assetId = randomUUID();
    await (await this.client()).$executeRawUnsafe(
      "INSERT INTO `VideoCategory` (`id`, `code`, `name`, `sortOrder`) VALUES ('cat-live', 'live', 'Live Replay', 30) ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `sortOrder` = VALUES(`sortOrder`)",
    );
    await (await this.client()).$executeRawUnsafe(
      "INSERT INTO `Video` (`id`, `creatorId`, `categoryId`, `title`, `description`, `status`, `playUrl`) VALUES (?, ?, 'cat-live', ?, 'Replay registered by live-reward internal API.', 'DRAFT', ?)",
      videoId,
      input.creatorId,
      input.title,
      `https://cdn.example.test/${input.objectKey}`,
    );
    try {
      await (await this.client()).$executeRawUnsafe(
        "INSERT INTO `VideoAsset` (`id`, `videoId`, `kind`, `bucket`, `objectKey`, `requestId`, `mimeType`, `url`) VALUES (?, ?, 'REPLAY', 'videoplayer-content', ?, ?, ?, ?)",
        assetId,
        videoId,
        input.objectKey,
        input.requestId,
        input.mimeType,
        `https://cdn.example.test/${input.objectKey}`,
      );
    } catch {
      await (await this.client()).$executeRawUnsafe('DELETE FROM `Video` WHERE id = ?', videoId);
      const replay = await this.findReplay(input.requestId, input.objectKey);
      if (replay) {
        return sameReplay(replay, input) ? { ok: true as const, record: replay, replayed: true } : { ok: false as const, status: 409 as const, message: 'replay idempotency key conflicts with a different payload' };
      }
      throw new Error('failed to register replay content asset');
    }
    return { ok: true as const, record: { ...input, contentVideoId: videoId, assetId }, replayed: false };
  }

  async batchSummary(ids: string[]) {
    return Promise.all(
      ids.map(async (id) => {
        const video = await this.findPublishedVideo(id);
        return video ? { id, found: true as const, title: video.title, coverUrl: video.coverUrl, status: video.status } : { id, found: false as const };
      }),
    );
  }

  async moderationTarget(targetType: ModerationTargetType, targetId: string): Promise<ModerationTargetSnapshot | null> {
    if (targetType === 'VIDEO') {
      const rows = await (await this.client()).$queryRawUnsafe<Array<{
        id: string;
        title: string;
        description: string;
        status: string;
        creatorId: string;
        coverUrl: string | null;
        playUrl: string | null;
        durationSeconds: number;
        createdAt: Date;
        publishedAt: Date | null;
        submittedAt: Date | null;
        rejectReason: string | null;
      }>>('SELECT id, title, description, status, creatorId, coverUrl, playUrl, durationSeconds, createdAt, publishedAt, submittedAt, reviewDecisionReason AS rejectReason FROM `Video` WHERE id = ? LIMIT 1', targetId);
      const row = rows[0];
      return row ? { targetType, targetId, videoId: row.id, ...row } : null;
    }
    const table = targetType === 'COMMENT' ? 'Comment' : 'VideoDanmaku';
    const rows = await (await this.client()).$queryRawUnsafe<Array<{ id: string; videoId: string; userId: string; body: string; status: string; videoTitle: string }>>(
      `SELECT t.id, t.videoId, t.userId, t.body, t.status, v.title AS videoTitle FROM \`${table}\` t INNER JOIN \`Video\` v ON v.id = t.videoId WHERE t.id = ? LIMIT 1`,
      targetId,
    );
    const row = rows[0];
    return row ? { targetType, targetId, videoId: row.videoId, content: row.body, status: row.status, user: { id: row.userId, nickname: `用户#${row.userId}` }, video: { id: row.videoId, title: row.videoTitle } } : null;
  }

  async viewerState(videoId: string, userId: string) {
    const [likes, favorites] = await Promise.all([
      (await this.client()).$queryRawUnsafe<Array<{ total: bigint | number }>>('SELECT COUNT(*) AS total FROM `VideoLike` WHERE videoId = ? AND userId = ?', videoId, userId),
      (await this.client()).$queryRawUnsafe<Array<{ total: bigint | number }>>('SELECT COUNT(*) AS total FROM `Favorite` WHERE videoId = ? AND userId = ?', videoId, userId),
    ]);
    return { isLiked: Number(likes[0]?.total ?? 0) > 0, isFavorited: Number(favorites[0]?.total ?? 0) > 0 };
  }

  async listComments(videoId: string) {
    return (await this.client()).$queryRawUnsafe<CommentRecord[]>(
      "SELECT id, videoId, userId, parentId, rootId, body, imageUrl, status, replyCount, createdAt, updatedAt FROM `Comment` WHERE videoId = ? AND status = 'VISIBLE' ORDER BY createdAt ASC, id ASC",
      videoId,
    );
  }

  async createComment(input: { videoId: string; principal: ContentPrincipal; body: string; imageUrl: string | null; parentId: string | null; requestId: string }) {
    return this.withReceipt({ requestId: input.requestId, operation: 'comment.create', actorId: input.principal.id, resourceId: input.videoId, payload: { body: input.body, imageUrl: input.imageUrl, parentId: input.parentId } }, async (transaction) => {
      const video = await this.requirePublished(transaction, input.videoId);
      let parent: { id: string; rootId: string | null; userId: string } | undefined;
      if (input.parentId) {
        const parents = await transaction.$queryRawUnsafe<Array<{ id: string; rootId: string | null; userId: string }>>(
          "SELECT id, rootId, userId FROM `Comment` WHERE id = ? AND videoId = ? AND status = 'VISIBLE' LIMIT 1",
          input.parentId,
          input.videoId,
        );
        parent = parents[0];
        if (!parent) throw new ContentHttpError(404, 'parent comment not found');
      }
      const id = `comment-${randomUUID()}`;
      const rootId = parent ? parent.rootId ?? parent.id : null;
      await transaction.$executeRawUnsafe(
        "INSERT INTO `Comment` (id, videoId, userId, parentId, rootId, body, imageUrl, status, replyCount, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, 'VISIBLE', 0, NOW(3), NOW(3))",
        id,
        input.videoId,
        input.principal.id,
        parent?.id ?? null,
        rootId,
        input.body,
        input.imageUrl,
      );
      await transaction.$executeRawUnsafe('UPDATE `Video` SET commentCount = commentCount + 1 WHERE id = ?', input.videoId);
      if (parent) await transaction.$executeRawUnsafe('UPDATE `Comment` SET replyCount = replyCount + 1 WHERE id = ?', parent.id);
      const recipientId = parent?.userId ?? video.creatorId;
      if (recipientId !== input.principal.id) {
        await this.enqueueNotification(transaction, {
          requestId: `${input.requestId}:notification`.slice(0, 128),
          recipientId,
          actorId: input.principal.id,
          type: parent ? 'REPLY' : 'COMMENT',
          title: parent ? '收到新的回复' : '收到新的评论',
          content: `${input.principal.nickname}：${(input.body || '[图片评论]').slice(0, 80)}`,
          relatedType: 'VIDEO',
          relatedId: input.videoId,
        });
      }
      const now = new Date().toISOString();
      return { id, videoId: input.videoId, userId: input.principal.id, parentId: parent?.id ?? null, rootId, body: input.body, imageUrl: input.imageUrl, status: 'VISIBLE' as const, replyCount: 0, createdAt: now, updatedAt: now };
    });
  }

  async withdrawComment(input: { videoId: string; commentId: string; principal: ContentPrincipal; requestId: string }) {
    return this.withReceipt({ requestId: input.requestId, operation: 'comment.withdraw', actorId: input.principal.id, resourceId: input.commentId, payload: { videoId: input.videoId } }, async (transaction) => {
      const targets = await transaction.$queryRawUnsafe<Array<{ id: string; userId: string; parentId: string | null; status: TextStatus }>>(
        'SELECT id, userId, parentId, status FROM `Comment` WHERE id = ? AND videoId = ? LIMIT 1',
        input.commentId,
        input.videoId,
      );
      const target = targets[0];
      if (!target || target.status !== 'VISIBLE') throw new ContentHttpError(404, 'comment not found');
      if (target.userId !== input.principal.id && !input.principal.isAdmin) throw new ContentHttpError(403, 'cannot withdraw others comments');
      const comments = await transaction.$queryRawUnsafe<Array<{ id: string; parentId: string | null }>>(
        "SELECT id, parentId FROM `Comment` WHERE videoId = ? AND status = 'VISIBLE'",
        input.videoId,
      );
      const ids = new Set<string>([target.id]);
      let changed = true;
      while (changed) {
        changed = false;
        for (const item of comments) {
          if (item.parentId && ids.has(item.parentId) && !ids.has(item.id)) {
            ids.add(item.id);
            changed = true;
          }
        }
      }
      const values = [...ids];
      await transaction.$executeRawUnsafe(`UPDATE \`Comment\` SET status = 'DELETED' WHERE id IN (${values.map(() => '?').join(',')})`, ...values);
      await transaction.$executeRawUnsafe('UPDATE `Video` SET commentCount = GREATEST(commentCount - ?, 0) WHERE id = ?', values.length, input.videoId);
      if (target.parentId) await transaction.$executeRawUnsafe('UPDATE `Comment` SET replyCount = GREATEST(replyCount - 1, 0) WHERE id = ?', target.parentId);
      return { withdrawn: true as const, commentId: target.id, withdrawnCount: values.length };
    });
  }

  async setLike(input: { videoId: string; principal: ContentPrincipal; liked: boolean; requestId: string }) {
    return this.withReceipt({ requestId: input.requestId, operation: input.liked ? 'video.like' : 'video.unlike', actorId: input.principal.id, resourceId: input.videoId, payload: {} }, async (transaction) => {
      const video = await this.requirePublished(transaction, input.videoId);
      if (input.liked) {
        const inserted = await transaction.$executeRawUnsafe(
          'INSERT IGNORE INTO `VideoLike` (id, videoId, userId, requestId, createdAt) VALUES (?, ?, ?, ?, NOW(3))',
          `like-${randomUUID()}`,
          input.videoId,
          input.principal.id,
          input.requestId,
        );
        if (inserted === 1) {
          await transaction.$executeRawUnsafe('UPDATE `Video` SET likeCount = likeCount + 1 WHERE id = ?', input.videoId);
          if (video.creatorId !== input.principal.id) await this.enqueueNotification(transaction, { requestId: `${input.requestId}:notification`.slice(0, 128), recipientId: video.creatorId, actorId: input.principal.id, type: 'LIKE', title: '收到新的点赞', content: `${input.principal.nickname} 点赞了你的视频`, relatedType: 'VIDEO', relatedId: input.videoId });
        }
      } else {
        const deleted = await transaction.$executeRawUnsafe('DELETE FROM `VideoLike` WHERE videoId = ? AND userId = ?', input.videoId, input.principal.id);
        if (deleted === 1) await transaction.$executeRawUnsafe('UPDATE `Video` SET likeCount = GREATEST(likeCount - 1, 0) WHERE id = ?', input.videoId);
      }
      return { liked: input.liked };
    });
  }

  async setFavorite(input: { videoId: string; principal: ContentPrincipal; folderId: string | null; favorited: boolean; requestId: string }) {
    return this.withReceipt({ requestId: input.requestId, operation: input.favorited ? 'video.favorite' : 'video.unfavorite', actorId: input.principal.id, resourceId: input.videoId, payload: { folderId: input.folderId } }, async (transaction) => {
      const video = await this.requirePublished(transaction, input.videoId);
      if (!input.favorited) {
        const deleted = await transaction.$executeRawUnsafe('DELETE FROM `Favorite` WHERE videoId = ? AND userId = ?', input.videoId, input.principal.id);
        if (deleted === 1) await transaction.$executeRawUnsafe('UPDATE `Video` SET favoriteCount = GREATEST(favoriteCount - 1, 0) WHERE id = ?', input.videoId);
        return { favorited: false };
      }
      const defaultFolder = await this.ensureDefaultFolder(transaction, input.principal.id);
      const folderId = input.folderId ?? defaultFolder.id;
      const folders = await transaction.$queryRawUnsafe<Array<{ id: string; name: string }>>('SELECT id, name FROM `FavoriteFolder` WHERE id = ? AND userId = ? LIMIT 1', folderId, input.principal.id);
      const folder = folders[0];
      if (!folder) throw new ContentHttpError(404, 'favorite folder not found');
      const inserted = await transaction.$executeRawUnsafe(
        'INSERT IGNORE INTO `Favorite` (id, userId, videoId, folderId, requestId, createdAt) VALUES (?, ?, ?, ?, ?, NOW(3))',
        `favorite-${randomUUID()}`,
        input.principal.id,
        input.videoId,
        folder.id,
        input.requestId,
      );
      if (inserted === 1) {
        await transaction.$executeRawUnsafe('UPDATE `Video` SET favoriteCount = favoriteCount + 1 WHERE id = ?', input.videoId);
        if (video.creatorId !== input.principal.id) await this.enqueueNotification(transaction, { requestId: `${input.requestId}:notification`.slice(0, 128), recipientId: video.creatorId, actorId: input.principal.id, type: 'FAVORITE', title: '收到新的收藏', content: `${input.principal.nickname} 收藏了你的视频`, relatedType: 'VIDEO', relatedId: input.videoId });
      } else {
        await transaction.$executeRawUnsafe('UPDATE `Favorite` SET folderId = ? WHERE videoId = ? AND userId = ?', folder.id, input.videoId, input.principal.id);
      }
      return { favorited: true, folderId: folder.id, folderName: folder.name };
    });
  }

  async recordPlay(input: { videoId: string; principal: ContentPrincipal | null; videoDurationSeconds: number | null; requestId: string }) {
    return this.withReceipt({ requestId: input.requestId, operation: 'video.play', actorId: input.principal?.id ?? null, resourceId: input.videoId, payload: { videoDurationSeconds: input.videoDurationSeconds } }, async (transaction) => {
      const video = await this.requirePublished(transaction, input.videoId);
      await transaction.$executeRawUnsafe('UPDATE `Video` SET playCount = playCount + 1 WHERE id = ?', input.videoId);
      await transaction.$executeRawUnsafe(
        'INSERT INTO `CreatorPlayDaily` (id, creatorId, date, plays, createdAt, updatedAt) VALUES (?, ?, CURDATE(), 1, NOW(3), NOW(3)) ON DUPLICATE KEY UPDATE plays = plays + 1, updatedAt = NOW(3)',
        `play-daily-${randomUUID()}`,
        video.creatorId,
      );
      if (input.principal) {
        const duration = Math.max(video.durationSeconds, input.videoDurationSeconds ?? 0);
        await transaction.$executeRawUnsafe(
          `INSERT INTO \`UserVideoWatch\`
            (id, userId, videoId, progressSeconds, completed, playCount, totalWatchDurationSeconds, lastWatchDurationSeconds, videoDurationSeconds, maxWatchRatio, lastWatchRatio, completedCount, lastWatchedAt, createdAt, updatedAt)
           VALUES (?, ?, ?, 0, false, 1, 0, 0, ?, 0, 0, 0, NOW(3), NOW(3), NOW(3))
           ON DUPLICATE KEY UPDATE playCount = playCount + 1, videoDurationSeconds = GREATEST(videoDurationSeconds, VALUES(videoDurationSeconds)), lastWatchedAt = NOW(3), updatedAt = NOW(3)`,
          `watch-${randomUUID()}`,
          input.principal.id,
          input.videoId,
          duration,
        );
      }
      const rows = await transaction.$queryRawUnsafe<Array<{ playCount: number }>>('SELECT playCount FROM `Video` WHERE id = ?', input.videoId);
      return { videoId: input.videoId, playCount: Number(rows[0]?.playCount ?? video.playCount + 1) };
    });
  }

  async recordWatchProgress(input: { videoId: string; principal: ContentPrincipal; watchedSeconds: number; currentTimeSeconds: number; videoDurationSeconds: number | null; event: 'pause' | 'leave' | 'ended'; requestId: string }) {
    return this.withReceipt({ requestId: input.requestId, operation: 'video.watch-progress', actorId: input.principal.id, resourceId: input.videoId, payload: { watchedSeconds: input.watchedSeconds, currentTimeSeconds: input.currentTimeSeconds, videoDurationSeconds: input.videoDurationSeconds, event: input.event } }, async (transaction) => {
      const video = await this.requirePublished(transaction, input.videoId);
      const rows = await transaction.$queryRawUnsafe<Array<{ maxWatchRatio: number; videoDurationSeconds: number }>>('SELECT maxWatchRatio, videoDurationSeconds FROM `UserVideoWatch` WHERE userId = ? AND videoId = ? LIMIT 1', input.principal.id, input.videoId);
      const existing = rows[0];
      const duration = Math.max(video.durationSeconds, input.videoDurationSeconds ?? 0, existing?.videoDurationSeconds ?? 0);
      const watched = Math.min(7_200, Math.max(0, Math.round(input.watchedSeconds)));
      const current = duration > 0 ? Math.min(duration, Math.max(0, Math.round(input.currentTimeSeconds))) : Math.max(0, Math.round(input.currentTimeSeconds));
      const ratio = duration > 0 ? Math.min(1, current / duration) : 0;
      const complete = (input.event === 'ended' || ratio >= 0.9) && (existing?.maxWatchRatio ?? 0) < 0.9;
      await transaction.$executeRawUnsafe(
        `INSERT INTO \`UserVideoWatch\`
          (id, userId, videoId, progressSeconds, completed, playCount, totalWatchDurationSeconds, lastWatchDurationSeconds, videoDurationSeconds, maxWatchRatio, lastWatchRatio, completedCount, lastWatchedAt, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, NOW(3), NOW(3), NOW(3))
         ON DUPLICATE KEY UPDATE progressSeconds = VALUES(progressSeconds), completed = completed OR VALUES(completed), totalWatchDurationSeconds = totalWatchDurationSeconds + VALUES(totalWatchDurationSeconds), lastWatchDurationSeconds = VALUES(lastWatchDurationSeconds), videoDurationSeconds = GREATEST(videoDurationSeconds, VALUES(videoDurationSeconds)), maxWatchRatio = GREATEST(maxWatchRatio, VALUES(maxWatchRatio)), lastWatchRatio = VALUES(lastWatchRatio), completedCount = completedCount + VALUES(completedCount), lastWatchedAt = NOW(3), updatedAt = NOW(3)`,
        `watch-${randomUUID()}`,
        input.principal.id,
        input.videoId,
        current,
        complete ? 1 : 0,
        watched,
        current,
        duration,
        ratio,
        ratio,
        complete ? 1 : 0,
      );
      const records = await transaction.$queryRawUnsafe<Array<Record<string, unknown>>>('SELECT id, userId, videoId, progressSeconds, completed, playCount, totalWatchDurationSeconds, lastWatchDurationSeconds, videoDurationSeconds, maxWatchRatio, lastWatchRatio, completedCount, lastWatchedAt, createdAt, updatedAt FROM `UserVideoWatch` WHERE userId = ? AND videoId = ? LIMIT 1', input.principal.id, input.videoId);
      return records[0] ?? {};
    });
  }

  async listDanmaku(videoId: string, fromMs: number, toMs: number) {
    return (await this.client()).$queryRawUnsafe<DanmakuRecord[]>(
      "SELECT id, videoId, userId, body, timeOffsetMs, color, status, createdAt FROM `VideoDanmaku` WHERE videoId = ? AND status = 'VISIBLE' AND timeOffsetMs BETWEEN ? AND ? ORDER BY timeOffsetMs ASC, createdAt ASC",
      videoId,
      fromMs,
      toMs,
    );
  }

  async createDanmaku(input: { videoId: string; principal: ContentPrincipal; body: string; timeOffsetMs: number; color: string; requestId: string }) {
    return this.withReceipt({ requestId: input.requestId, operation: 'danmaku.create', actorId: input.principal.id, resourceId: input.videoId, payload: { body: input.body, timeOffsetMs: input.timeOffsetMs, color: input.color } }, async (transaction) => {
      await this.requirePublished(transaction, input.videoId);
      const id = `danmaku-${randomUUID()}`;
      await transaction.$executeRawUnsafe(
        "INSERT INTO `VideoDanmaku` (id, videoId, userId, body, offsetSeconds, timeOffsetMs, color, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, 'VISIBLE', NOW(3))",
        id,
        input.videoId,
        input.principal.id,
        input.body,
        Math.floor(input.timeOffsetMs / 1_000),
        input.timeOffsetMs,
        input.color,
      );
      return { id, videoId: input.videoId, userId: input.principal.id, body: input.body, timeOffsetMs: input.timeOffsetMs, color: input.color, status: 'VISIBLE' as const, createdAt: new Date().toISOString() };
    });
  }

  async listFavoriteFolders(userId: string) {
    await this.ensureDefaultFolder(await this.client(), userId);
    const rows = await (await this.client()).$queryRawUnsafe<Array<{ id: string; userId: string; name: string; isDefault: number | boolean; videoCount: bigint | number; createdAt: Date; updatedAt: Date }>>(
      `SELECT folder.id, folder.userId, folder.name, folder.isDefault, folder.createdAt, folder.updatedAt, COUNT(favorite.id) AS videoCount
       FROM \`FavoriteFolder\` folder LEFT JOIN \`Favorite\` favorite ON favorite.folderId = folder.id
       WHERE folder.userId = ? GROUP BY folder.id ORDER BY folder.isDefault DESC, folder.updatedAt DESC, folder.createdAt ASC`,
      userId,
    );
    return rows.map((row) => ({ ...row, isDefault: Boolean(row.isDefault), videoCount: Number(row.videoCount) }));
  }

  async createFavoriteFolder(input: { principal: ContentPrincipal; name: string; requestId: string }) {
    const name = input.name.trim();
    if (!name || name.length > 64 || name === '默认收藏夹') throw new ContentHttpError(400, 'invalid favorite folder name');
    return this.withReceipt({ requestId: input.requestId, operation: 'favorite-folder.create', actorId: input.principal.id, resourceId: input.principal.id, payload: { name } }, async (transaction) => {
      await this.ensureDefaultFolder(transaction, input.principal.id);
      const id = `folder-${randomUUID()}`;
      try {
        await transaction.$executeRawUnsafe('INSERT INTO `FavoriteFolder` (id, userId, name, isDefault, createdAt, updatedAt) VALUES (?, ?, ?, false, NOW(3), NOW(3))', id, input.principal.id, name);
      } catch (error) {
        if (isDuplicateDatabaseError(error)) throw new ContentHttpError(409, 'favorite folder name already exists');
        throw error;
      }
      const now = new Date().toISOString();
      return { id, userId: input.principal.id, name, isDefault: false, videoCount: 0, createdAt: now, updatedAt: now };
    });
  }

  async deleteFavoriteFolder(input: { principal: ContentPrincipal; folderId: string; requestId: string }) {
    return this.withReceipt({ requestId: input.requestId, operation: 'favorite-folder.delete', actorId: input.principal.id, resourceId: input.folderId, payload: {} }, async (transaction) => {
      const defaultFolder = await this.ensureDefaultFolder(transaction, input.principal.id);
      const folders = await transaction.$queryRawUnsafe<Array<{ id: string; isDefault: number | boolean }>>('SELECT id, isDefault FROM `FavoriteFolder` WHERE id = ? AND userId = ? LIMIT 1', input.folderId, input.principal.id);
      const folder = folders[0];
      if (!folder) throw new ContentHttpError(404, 'favorite folder not found');
      if (folder.isDefault) throw new ContentHttpError(400, 'default favorite folder cannot be deleted');
      await transaction.$executeRawUnsafe('UPDATE `Favorite` SET folderId = ? WHERE userId = ? AND folderId = ?', defaultFolder.id, input.principal.id, folder.id);
      await transaction.$executeRawUnsafe('DELETE FROM `FavoriteFolder` WHERE id = ?', folder.id);
      return { deleted: true as const, folderId: folder.id, movedToFolderId: defaultFolder.id };
    });
  }

  async listUserVideos(userId: string, kind: 'favorites' | 'likes' | 'history', folderId?: string) {
    let join = '';
    const parameters: Array<string | number> = [userId];
    if (kind === 'favorites') {
      const resolvedFolderId = folderId ?? (await this.ensureDefaultFolder(await this.client(), userId)).id;
      join = 'INNER JOIN `Favorite` relation ON relation.videoId = v.id AND relation.userId = ? AND relation.folderId = ?';
      parameters.push(resolvedFolderId);
    } else if (kind === 'likes') {
      join = 'INNER JOIN `VideoLike` relation ON relation.videoId = v.id AND relation.userId = ?';
    } else {
      join = 'INNER JOIN `UserVideoWatch` relation ON relation.videoId = v.id AND relation.userId = ?';
    }
    const orderBy = kind === 'history' ? 'COALESCE(relation.lastWatchedAt, relation.updatedAt) DESC' : 'relation.createdAt DESC';
    const rows = await (await this.client()).$queryRawUnsafe<RawVideo[]>(
      `${videoSelect()} ${join} WHERE v.status = 'PUBLISHED' ORDER BY ${orderBy}`,
      ...parameters,
    );
    return rows.map(rawVideo);
  }

  async pendingNotifications(limit: number) {
    return (await this.client()).$queryRawUnsafe<NotificationOutboxRecord[]>(
      "SELECT id, requestId, recipientId, actorId, type, title, content, relatedType, relatedId, attempts FROM `NotificationOutbox` WHERE status = 'PENDING' AND nextRetryAt <= NOW(3) ORDER BY createdAt ASC LIMIT ?",
      limit,
    );
  }

  async markNotificationDelivered(id: string) {
    await (await this.client()).$executeRawUnsafe("UPDATE `NotificationOutbox` SET status = 'DELIVERED', deliveredAt = NOW(3), lastError = NULL, updatedAt = NOW(3) WHERE id = ?", id);
  }

  async markNotificationFailed(id: string, error: string, retryable: boolean, attempts: number) {
    const status = retryable && attempts < 5 ? 'PENDING' : 'FAILED';
    const nextRetryAt = new Date(Date.now() + Math.min(60_000, 1_000 * 2 ** attempts));
    await (await this.client()).$executeRawUnsafe(
      'UPDATE `NotificationOutbox` SET status = ?, attempts = ?, lastError = ?, nextRetryAt = ?, updatedAt = NOW(3) WHERE id = ?',
      status,
      attempts,
      error.slice(0, 2_000),
      nextRetryAt,
      id,
    );
  }

  private async findReviewDecision(decisionId: string): Promise<ReviewDecisionRecord | null> {
    const rows = await (await this.client()).$queryRawUnsafe<Array<{ id: string; reviewDecisionId: string | null; reviewDecision: ReviewDecisionRecord['decision'] | null; reviewDecisionReason: string | null; status: VideoStatus }>>(
      'SELECT id, reviewDecisionId, reviewDecision, reviewDecisionReason, status FROM `Video` WHERE reviewDecisionId = ? LIMIT 1',
      decisionId,
    );
    const row = rows[0];
    return row ? { decisionId, videoId: row.id, decision: row.reviewDecision ?? statusToDecision(row.status), appliedStatus: row.status, reason: row.reviewDecisionReason } : null;
  }

  private async findReplay(requestId: string, objectKey: string): Promise<ReplayRecord | null> {
    const rows = await (await this.client()).$queryRawUnsafe<
      Array<{ requestId: string | null; objectKey: string; mimeType: 'video/webm' | 'video/mp4'; title: string; creatorId: string; videoId: string; id: string }>
    >(
      "SELECT a.requestId, a.objectKey, a.mimeType, v.title, v.creatorId, a.videoId, a.id FROM `VideoAsset` a INNER JOIN `Video` v ON v.id = a.videoId WHERE a.kind = 'REPLAY' AND (a.requestId = ? OR a.objectKey = ?) LIMIT 1",
      requestId,
      objectKey,
    );
    const row = rows[0];
    return row && row.requestId ? { requestId: row.requestId, objectKey: row.objectKey, mimeType: row.mimeType, title: row.title, creatorId: row.creatorId, contentVideoId: row.videoId, assetId: row.id } : null;
  }
}

export function validateVideoMediaType(candidate: MediaCandidate): { ok: true } | { ok: false; reason: string } {
  const extension = candidate.filename.toLowerCase().split('.').pop();
  if (!extension || !['mp4', 'webm'].includes(extension)) {
    return { ok: false, reason: 'unsupported file extension' };
  }
  if ((extension === 'mp4' && candidate.mimeType !== 'video/mp4') || (extension === 'webm' && candidate.mimeType !== 'video/webm')) {
    return { ok: false, reason: 'extension and MIME type do not match' };
  }

  return { ok: true };
}

function runFfprobe(filePath: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const child = spawn('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=codec_type', '-of', 'default=noprint_wrappers=1:nokey=1', filePath], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error('ffprobe timed out'));
    }, 5_000);
    child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk));
    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve(Buffer.concat(stdout).toString('utf8').trim().split(/\s+/).includes('video'));
        return;
      }
      reject(new Error(Buffer.concat(stderr).toString('utf8').trim() || `ffprobe exited with ${code}`));
    });
  });
}

export async function probeVideoStream(candidate: MediaCandidate): Promise<{ ok: true } | { ok: false; reason: string }> {
  const extensionValidation = validateVideoMediaType(candidate);
  if (!extensionValidation.ok) return extensionValidation;

  const extension = candidate.filename.toLowerCase().split('.').pop() as 'mp4' | 'webm';
  const directory = await mkdtemp(join(tmpdir(), 'content-media-ffprobe-'));
  const filePath = join(directory, `candidate.${extension}`);
  try {
    await writeFile(filePath, candidate.bytes);
    return (await runFfprobe(filePath)) ? { ok: true } : { ok: false, reason: 'ffprobe found no video stream' };
  } catch {
    return { ok: false, reason: 'ffprobe could not verify video stream' };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

export const ffprobeVideoStreamProbe: VideoStreamProbe = { probe: probeVideoStream };

export async function createVideoAfterMediaValidation(
  state: ContentState,
  candidate: MediaCandidate,
  insertVideo: () => Promise<VideoRecord>,
  streamProbe: VideoStreamProbe = ffprobeVideoStreamProbe,
  objectStore?: ObjectDeletionStore,
): Promise<{ status: 201; video: VideoRecord } | { status: 400 | 500; message: string }> {
  const validation = validateVideoMediaType(candidate);
  if (!validation.ok) {
    return { status: 400, message: validation.reason };
  }
  const streamValidation = await streamProbe.probe(candidate);
  if (!streamValidation.ok) {
    return { status: 400, message: streamValidation.reason };
  }

  const objectKey = candidate.objectKey ?? `uploads/${randomUUID()}.${candidate.filename.split('.').pop()}`;
  try {
    const video = await insertVideo();
    state.assets.push({
      id: `asset-${state.assets.length + 1}`,
      videoId: video.id,
      kind: 'ORIGINAL',
      objectKey,
      bucket: 'videoplayer-content',
      mimeType: candidate.mimeType,
      url: `https://cdn.example.test/${objectKey}`,
    });
    return { status: 201, video };
  } catch {
    await objectStore?.deleteObject('videoplayer-content', objectKey);
    state.deletedObjects.push(objectKey);
    return { status: 500, message: 'database write failed after object upload; object was deleted' };
  }
}

function getRequestId(request: IncomingMessage): string {
  const header = request.headers['x-request-id'];
  return typeof header === 'string' && header.trim() ? header.trim().slice(0, 128) : randomUUID();
}

function writeJson<T>(response: ServerResponse, statusCode: number, payload: ApiResponse<T>, requestId: string): void {
  const body = JSON.stringify(payload);
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'x-request-id': requestId,
    'x-service-version': process.env.GIT_SHA?.trim() || process.env.SERVICE_VERSION?.trim() || 'dev',
  });
  response.end(body);
}

function readBody(request: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    request.on('data', (chunk: Buffer) => chunks.push(chunk));
    request.on('error', reject);
    request.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8').trim();
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('invalid json body'));
      }
    });
  });
}

function fallbackCreatorSummary(id: string): CreatorSummary {
  return { id, nickname: '用户信息暂不可用', avatarUrl: null, unavailable: true };
}

function normalizePage(value: string | null): number {
  const parsed = Number(value ?? 1);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;
}

function normalizePageSize(value: string | null): number {
  const parsed = Number(value ?? 20);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(50, Math.floor(parsed)) : 20;
}

function normalizeSortBy(value: string | null): 'best' | 'hot' | 'latest' {
  return value === 'hot' || value === 'latest' ? value : 'best';
}

function canonicalValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, canonicalValue(item)]));
  }
  return value;
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalValue(value));
}

function isDuplicateDatabaseError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const value = error as { code?: unknown; meta?: unknown; message?: unknown };
  const details = `${typeof value.message === 'string' ? value.message : ''} ${JSON.stringify(value.meta ?? '')}`;
  return value.code === 'P2002' || (value.code === 'P2010' && /(?:1062|duplicate)/i.test(details));
}

function publicId(value: string): string | number {
  const numeric = Number(value);
  return Number.isSafeInteger(numeric) ? numeric : value;
}

function offset(options: { page: number; pageSize: number }): number {
  return (options.page - 1) * options.pageSize;
}

function sameReviewDecision(existing: ReviewDecisionRecord, input: { videoId: string; decision: ReviewDecisionRecord['decision']; reason: string | null }): boolean {
  return existing.videoId === input.videoId && existing.decision === input.decision && (existing.reason ?? null) === (input.reason ?? null);
}

function sameReplay(existing: ReplayRecord, input: { requestId: string; objectKey: string; mimeType: 'video/webm' | 'video/mp4'; title: string; creatorId: string }): boolean {
  return (
    existing.requestId === input.requestId &&
    existing.objectKey === input.objectKey &&
    existing.mimeType === input.mimeType &&
    existing.title === input.title &&
    existing.creatorId === input.creatorId
  );
}

function statusToDecision(status: VideoStatus): ReviewDecisionRecord['decision'] {
  if (status === 'HIDDEN') return 'HIDDEN';
  if (status === 'REJECTED') return 'REJECTED';
  return 'APPROVED';
}

function videoSelect(): string {
  return `
    SELECT v.id, v.title, v.description, v.creatorId, v.categoryId, v.legacyCategory, v.status, v.coverUrl, v.playUrl,
           v.durationSeconds, v.tags, v.publishedAt, v.submittedAt, v.reviewSubmissionRequestId,
           v.reviewDecisionReason AS rejectReason, v.createdAt, c.code AS categoryCode, c.name AS categoryName,
           v.playCount, v.likeCount, v.favoriteCount, v.commentCount, v.coinCount
    FROM Video v
    LEFT JOIN VideoCategory c ON c.id = v.categoryId
  `;
}

function videoCountSelect(): string {
  return 'SELECT COUNT(*) AS total FROM Video v LEFT JOIN VideoCategory c ON c.id = v.categoryId';
}

function toIso(value: Date | string | null): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function rawVideo(row: RawVideo): VideoRecord {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    creatorId: row.creatorId,
    categoryId: row.categoryId,
    legacyCategory: row.legacyCategory,
    status: row.status,
    coverUrl: row.coverUrl,
    playUrl: row.playUrl,
    durationSeconds: row.durationSeconds,
    publishedAt: toIso(row.publishedAt),
    submittedAt: toIso(row.submittedAt),
    reviewSubmissionRequestId: row.reviewSubmissionRequestId,
    rejectReason: row.rejectReason,
    tags: Array.isArray(row.tags) ? row.tags.filter((tag): tag is string => typeof tag === 'string') : [],
    playCount: Number(row.playCount ?? 0),
    likeCount: Number(row.likeCount ?? 0),
    favoriteCount: Number(row.favoriteCount ?? 0),
    commentCount: Number(row.commentCount ?? 0),
    coinCount: Number(row.coinCount ?? 0),
    createdAt: toIso(row.createdAt) ?? new Date(0).toISOString(),
    categoryCode: row.categoryCode,
    categoryName: row.categoryName,
  };
}

function buildSearchResult(
  options: { keyword: string; page: number; pageSize: number; categoryCode?: string; sortBy: 'best' | 'hot' | 'latest' },
  videos: VideoRecord[],
  videoCount: number,
): SearchResult {
  return {
    keyword: options.keyword,
    tab: 'video',
    sortBy: options.sortBy,
    categoryCode: options.categoryCode ?? 'recommend',
    page: options.page,
    pageSize: options.pageSize,
    counts: { video: videoCount, user: 0, live: 0 },
    video: videos,
    live: [],
    user: [],
    category: options.categoryCode ? { code: options.categoryCode, label: options.categoryCode } : null,
  };
}

async function withTimeout<T>(task: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('identity batch-summary timeout')), timeoutMs);
  });
  try {
    return await Promise.race([task, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function creatorSummaries(
  identityClient: IdentityBatchClient,
  videos: VideoRecord[],
  requestId: string,
  timeoutMs: number,
): Promise<Map<string, CreatorSummary>> {
  const ids = [...new Set(videos.map((video) => video.creatorId))];
  try {
    return await withTimeout(identityClient.batchSummary(ids, requestId), timeoutMs);
  } catch {
    return new Map(ids.map((id) => [id, fallbackCreatorSummary(id)]));
  }
}

async function identitySummaries(identityClient: IdentityBatchClient, userIds: string[], requestId: string, timeoutMs: number) {
  const ids = [...new Set(userIds)];
  try {
    return await withTimeout(identityClient.batchSummary(ids, requestId), timeoutMs);
  } catch {
    return new Map(ids.map((id) => [id, fallbackCreatorSummary(id)]));
  }
}

function publicCommentTree(comments: CommentRecord[], users: Map<string, CreatorSummary>) {
  type CommentPayload = ReturnType<typeof publicComment> & { replies: CommentPayload[] };
  const nodes = new Map<string, CommentPayload>();
  for (const comment of comments) nodes.set(comment.id, { ...publicComment(comment, users), replies: [] });
  const roots: CommentPayload[] = [];
  for (const comment of comments) {
    const node = nodes.get(comment.id)!;
    const parent = comment.parentId ? nodes.get(comment.parentId) : undefined;
    if (parent) parent.replies.push(node);
    else roots.push(node);
  }
  return roots;
}

function publicComment(comment: CommentRecord, users: Map<string, CreatorSummary>) {
  const user = users.get(comment.userId) ?? fallbackCreatorSummary(comment.userId);
  return {
    id: publicId(comment.id),
    videoId: publicId(comment.videoId),
    userId: publicId(comment.userId),
    parentId: comment.parentId ? publicId(comment.parentId) : null,
    rootId: comment.rootId ? publicId(comment.rootId) : null,
    content: comment.body,
    imageUrl: comment.imageUrl,
    replyCount: comment.replyCount,
    status: comment.status === 'VISIBLE' ? 'NORMAL' : comment.status,
    createdAt: toIso(comment.createdAt) ?? new Date(0).toISOString(),
    updatedAt: toIso(comment.updatedAt) ?? new Date(0).toISOString(),
    user: { id: publicId(comment.userId), nickname: user.nickname, avatarUrl: user.avatarUrl },
  };
}

function publicDanmaku(item: DanmakuRecord, users: Map<string, CreatorSummary>) {
  const user = users.get(item.userId) ?? fallbackCreatorSummary(item.userId);
  return {
    id: publicId(item.id),
    videoId: publicId(item.videoId),
    userId: publicId(item.userId),
    content: item.body,
    color: item.color,
    timeOffsetMs: item.timeOffsetMs,
    status: item.status === 'VISIBLE' ? 'NORMAL' : item.status,
    createdAt: toIso(item.createdAt) ?? new Date(0).toISOString(),
    user: { id: publicId(item.userId), nickname: user.nickname },
  };
}

function publicVideo(video: VideoRecord, creators: Map<string, CreatorSummary>) {
  const creator = creators.get(video.creatorId) ?? fallbackCreatorSummary(video.creatorId);
  const numericId = Number(video.id);
  const numericCreatorId = Number(video.creatorId);
  return {
    id: Number.isSafeInteger(numericId) ? numericId : video.id,
    title: video.title,
    description: video.description,
    status: video.status,
    category: video.legacyCategory ?? video.categoryCode ?? undefined,
    categories: video.tags.length ? video.tags : video.categoryCode ? [video.categoryCode] : [],
    coverUrl: video.coverUrl,
    playUrl: video.playUrl,
    durationSeconds: video.durationSeconds,
    publishedAt: video.publishedAt,
    submittedAt: video.submittedAt,
    rejectReason: video.rejectReason,
    createdAt: video.createdAt,
    playCount: video.playCount,
    likeCount: video.likeCount,
    favoriteCount: video.favoriteCount,
    commentCount: video.commentCount,
    coinCount: video.coinCount,
    creatorId: Number.isSafeInteger(numericCreatorId) ? numericCreatorId : video.creatorId,
    creator: {
      id: Number.isSafeInteger(numericCreatorId) ? numericCreatorId : creator.id,
      nickname: creator.nickname,
      avatarUrl: creator.avatarUrl,
    },
  };
}

function publicVideoDetail(video: VideoRecord, creators: Map<string, CreatorSummary>, viewer = { isLiked: false, isFavorited: false }) {
  const card = publicVideo(video, creators);
  const creator = card.creator;
  return {
    ...card,
    uploadToken: '',
    rejectReason: video.rejectReason,
    submittedAt: video.submittedAt,
    updatedAt: video.createdAt,
    creator: {
      id: creator.id,
      nickname: creator.nickname,
      avatarUrl: creator.avatarUrl,
      role: 'USER',
      followerCount: 0,
    },
    isFollowingCreator: false,
    isLiked: viewer.isLiked,
    isFavorited: viewer.isFavorited,
    myCoinCount: 0,
    myCoinLimit: 5,
  };
}

function publishedVideos(state: ContentState): VideoRecord[] {
  return state.videos.filter((video) => video.status === 'PUBLISHED');
}

function requireInternal(request: IncomingMessage, response: ServerResponse, requestId: string, secret: string, scope: string): boolean {
  try {
    authorizeServiceRequest(request.headers.authorization, {
      audience: 'content-media',
      secret,
      requiredScopes: [scope],
    });
    return true;
  } catch (error) {
    writeJson(response, 401, failure(error instanceof Error ? error.message : 'unauthorized', requestId, 401), requestId);
    return false;
  }
}

function trustedContentPrincipal(request: IncomingMessage, requestId: string, secret: string): ContentPrincipal {
  const claims = authorizeServiceRequest(request.headers['x-gateway-authorization'], {
    audience: 'content-media',
    secret,
    requiredScopes: ['content.user.forward'],
    allowedCallers: ['gateway'],
  });
  if (claims.requestId !== requestId) throw new Error('Gateway JWT requestId does not match x-request-id');
  const rawId = String(request.headers['x-user-id'] ?? '').trim();
  const role = String(request.headers['x-user-role'] ?? 'USER').trim().toUpperCase();
  const encodedNickname = String(request.headers['x-user-nickname'] ?? '').trim();
  const id = Number(rawId);
  if (!Number.isSafeInteger(id) || id < 1) throw new Error('Trusted user context is invalid');
  let nickname = `user-${id}`;
  if (encodedNickname) {
    try {
      nickname = decodeURIComponent(encodedNickname).trim().slice(0, 64) || nickname;
    } catch {
      throw new Error('Trusted user nickname is invalid');
    }
  }
  return { id: String(id), nickname, role, isAdmin: role === 'ADMIN' };
}

function optionalTrustedContentPrincipal(request: IncomingMessage, requestId: string, secret: string): ContentPrincipal | null {
  if (!request.headers['x-gateway-authorization']) return null;
  return trustedContentPrincipal(request, requestId, secret);
}

function requireContentPrincipal(request: IncomingMessage, requestId: string, secret: string): ContentPrincipal {
  try {
    return trustedContentPrincipal(request, requestId, secret);
  } catch (error) {
    throw new ContentHttpError(401, error instanceof Error ? error.message : 'unauthorized');
  }
}

function serviceStatus(startedAt: number, status: 'live' | 'ready'): ServiceStatus {
  return {
    service: 'content-media',
    status,
    version: process.env.GIT_SHA?.trim() || process.env.SERVICE_VERSION?.trim() || 'dev',
    uptimeSeconds: Math.max(0, Math.floor((Date.now() - startedAt) / 1000)),
  };
}

export function createContentService(options: ContentServiceOptions = {}): Server {
  const repository = options.repository ?? (options.state ? new FixtureContentRepository(options.state) : new PrismaContentRepository());
  const internalJwtSecret = options.internalJwtSecret ?? process.env.SERVICE_JWT_SECRET ?? '';
  const identityTimeoutMs = options.identityTimeoutMs ?? DEFAULT_IDENTITY_TIMEOUT_MS;
  const identityBaseUrl = process.env.IDENTITY_SERVICE_URL?.trim();
  const identityClient = options.identityClient
    ?? (identityBaseUrl && internalJwtSecret
      ? new HttpIdentityBatchClient(identityBaseUrl, internalJwtSecret, identityTimeoutMs)
      : new MockIdentityBatchClient());
  const governanceBaseUrl = process.env.GOVERNANCE_SERVICE_URL?.trim();
  const governanceClient = options.governanceClient === undefined
    ? governanceBaseUrl
      ? new HttpGovernanceReviewClient({ baseUrl: governanceBaseUrl, jwtSecret: internalJwtSecret, timeoutMs: options.governanceTimeoutMs })
      : null
    : options.governanceClient;
  const notificationClient = options.notificationClient === undefined
    ? identityBaseUrl && internalJwtSecret
      ? new HttpIdentityNotificationClient(identityBaseUrl, internalJwtSecret, identityTimeoutMs)
      : null
    : options.notificationClient;
  const startedAt = Date.now();
  let notificationFlushRunning = false;

  async function flushNotificationOutbox() {
    if (!notificationClient || notificationFlushRunning) return;
    notificationFlushRunning = true;
    try {
      for (const item of await repository.pendingNotifications(10)) {
        try {
          await notificationClient.deliver(item);
          await repository.markNotificationDelivered(item.id);
        } catch (error) {
          const retryable = !(error instanceof ContentHttpError) && (typeof error !== 'object' || error === null || !('retryable' in error) || Boolean((error as { retryable?: boolean }).retryable));
          await repository.markNotificationFailed(item.id, error instanceof Error ? error.message : String(error), retryable, item.attempts + 1);
        }
      }
    } finally {
      notificationFlushRunning = false;
    }
  }

  const server = createServer(async (request, response) => {
    const requestId = getRequestId(request);
    const method = request.method ?? 'GET';
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    const path = url.pathname;

    try {
      if (method === 'GET' && path === '/health/live') {
        writeJson(response, 200, ok(serviceStatus(startedAt, 'live'), requestId), requestId);
        return;
      }
      if (method === 'GET' && path === '/health/ready') {
        const ready = await repository.ready();
        writeJson(response, ready ? 200 : 503, ready ? ok(serviceStatus(startedAt, 'ready'), requestId) : failure('content database unavailable', requestId, 503), requestId);
        return;
      }
      if (method === 'GET' && path === '/version') {
        const version: ServiceVersion = { service: 'content-media', version: serviceStatus(startedAt, 'live').version, node: process.version };
        writeJson(response, 200, ok(version, requestId), requestId);
        return;
      }

      if (method === 'GET' && path === '/api/v1/feeds/recommend') {
        const videos = await repository.listRecommended({
          page: normalizePage(url.searchParams.get('page')),
          pageSize: normalizePageSize(url.searchParams.get('pageSize')),
          categoryCode: url.searchParams.get('category') ?? url.searchParams.get('categoryCode') ?? undefined,
        });
        const creators = await creatorSummaries(identityClient, videos, requestId, identityTimeoutMs);
        writeJson(response, 200, ok(videos.map((video) => publicVideo(video, creators)), requestId), requestId);
        return;
      }

      if (method === 'GET' && path === '/api/v1/search/all') {
        const search = await repository.search({
          keyword: (url.searchParams.get('keyword') ?? url.searchParams.get('q') ?? '').trim(),
          page: normalizePage(url.searchParams.get('page')),
          pageSize: normalizePageSize(url.searchParams.get('pageSize')),
          categoryCode: url.searchParams.get('category') ?? url.searchParams.get('categoryCode') ?? undefined,
          sortBy: normalizeSortBy(url.searchParams.get('sortBy')),
        });
        const creators = await creatorSummaries(identityClient, search.video, requestId, identityTimeoutMs);
        writeJson(response, 200, ok({ ...search, video: search.video.map((video) => publicVideo(video, creators)) }, requestId), requestId);
        return;
      }

      const submitReviewMatch = path.match(/^\/api\/v1\/videos\/([^/]+)\/submit-review$/);
      if (method === 'POST' && submitReviewMatch) {
        let principal: { id: string; isAdmin: boolean };
        try {
          principal = trustedContentPrincipal(request, requestId, internalJwtSecret);
        } catch (error) {
          writeJson(response, 401, failure(error instanceof Error ? error.message : 'unauthorized', requestId, 401), requestId);
          return;
        }
        if (!governanceClient) {
          writeJson(response, 503, failure('governance review submission is not configured', requestId, 503), requestId);
          return;
        }
        const videoId = decodeURIComponent(submitReviewMatch[1]);
        const transition = await repository.submitReview({ videoId, userId: principal.id, isAdmin: principal.isAdmin, requestId });
        if (!transition.ok) {
          writeJson(response, transition.status, failure(transition.message, requestId, transition.status), requestId);
          return;
        }
        try {
          const review = await governanceClient.submitVideoReview(videoId, requestId);
          const numericVideoId = Number(videoId);
          writeJson(response, 200, ok({
            videoId: Number.isSafeInteger(numericVideoId) ? numericVideoId : videoId,
            reviewId: review.id,
            status: 'PENDING_REVIEW',
          }, requestId), requestId);
        } catch (error) {
          const safeToRollback = error instanceof GovernanceReviewError && !error.mayHaveCommitted;
          if (safeToRollback && !transition.replayed && transition.previousStatus) {
            await repository.rollbackReviewSubmission({
              videoId,
              requestId,
              previousStatus: transition.previousStatus,
              previousRequestId: transition.previousRequestId,
              previousSubmittedAt: transition.previousSubmittedAt,
            });
          }
          const status = error instanceof GovernanceReviewError && !error.unavailable ? 502 : 503;
          writeJson(response, status, failure(error instanceof Error ? error.message : 'governance review submission failed', requestId, status), requestId);
        }
        return;
      }

      if (path === '/api/v1/videos/my/favorite-folders') {
        const principal = requireContentPrincipal(request, requestId, internalJwtSecret);
        if (method === 'GET') {
          const folders = await repository.listFavoriteFolders(principal.id);
          writeJson(response, 200, ok(folders.map((folder) => ({
            id: publicId(folder.id),
            name: folder.name,
            isDefault: folder.isDefault,
            videoCount: folder.videoCount,
            createdAt: toIso(folder.createdAt),
            updatedAt: toIso(folder.updatedAt),
          })), requestId), requestId);
          return;
        }
        if (method === 'POST') {
          const body = (await readBody(request)) as { name?: unknown };
          const folder = await repository.createFavoriteFolder({ principal, name: typeof body.name === 'string' ? body.name : '', requestId });
          writeJson(response, 200, ok({ ...folder, id: publicId(folder.id), userId: publicId(folder.userId), createdAt: toIso(folder.createdAt), updatedAt: toIso(folder.updatedAt) }, requestId), requestId);
          return;
        }
      }

      const favoriteFolderDeleteMatch = path.match(/^\/api\/v1\/videos\/my\/favorite-folders\/([^/]+)$/);
      if (method === 'DELETE' && favoriteFolderDeleteMatch) {
        const principal = requireContentPrincipal(request, requestId, internalJwtSecret);
        const result = await repository.deleteFavoriteFolder({ principal, folderId: decodeURIComponent(favoriteFolderDeleteMatch[1]), requestId });
        writeJson(response, 200, ok({ ...result, folderId: publicId(result.folderId), movedToFolderId: publicId(result.movedToFolderId) }, requestId), requestId);
        return;
      }

      const myVideosMatch = path.match(/^\/api\/v1\/videos\/my\/(favorites|likes|history)$/);
      if (method === 'GET' && myVideosMatch) {
        const principal = requireContentPrincipal(request, requestId, internalJwtSecret);
        const kind = myVideosMatch[1] as 'favorites' | 'likes' | 'history';
        const videos = await repository.listUserVideos(principal.id, kind, url.searchParams.get('folderId') ?? undefined);
        const creators = await creatorSummaries(identityClient, videos, requestId, identityTimeoutMs);
        writeJson(response, 200, ok(videos.map((video) => publicVideo(video, creators)), requestId), requestId);
        return;
      }

      const commentThreadMatch = path.match(/^\/api\/v1\/videos\/([^/]+)\/comments\/([^/]+)\/thread$/);
      if (method === 'GET' && commentThreadMatch) {
        const comments = await repository.listComments(decodeURIComponent(commentThreadMatch[1]));
        const users = await identitySummaries(identityClient, comments.map((item) => item.userId), requestId, identityTimeoutMs);
        const threadId = decodeURIComponent(commentThreadMatch[2]);
        const thread = publicCommentTree(comments, users).find((item) => String(item.id) === threadId);
        if (!thread) throw new ContentHttpError(404, 'comment thread not found');
        writeJson(response, 200, ok(thread, requestId), requestId);
        return;
      }

      const commentDeleteMatch = path.match(/^\/api\/v1\/videos\/([^/]+)\/comments\/([^/]+)$/);
      if (method === 'DELETE' && commentDeleteMatch) {
        const principal = requireContentPrincipal(request, requestId, internalJwtSecret);
        const result = await repository.withdrawComment({ videoId: decodeURIComponent(commentDeleteMatch[1]), commentId: decodeURIComponent(commentDeleteMatch[2]), principal, requestId });
        writeJson(response, 200, ok({ ...result, commentId: publicId(result.commentId) }, requestId), requestId);
        return;
      }

      const commentsMatch = path.match(/^\/api\/v1\/videos\/([^/]+)\/comments$/);
      if (commentsMatch && method === 'GET') {
        const videoId = decodeURIComponent(commentsMatch[1]);
        const comments = await repository.listComments(videoId);
        const users = await identitySummaries(identityClient, comments.map((item) => item.userId), requestId, identityTimeoutMs);
        writeJson(response, 200, ok({ videoId: publicId(videoId), items: publicCommentTree(comments, users) }, requestId), requestId);
        return;
      }
      if (commentsMatch && method === 'POST') {
        const principal = requireContentPrincipal(request, requestId, internalJwtSecret);
        const body = (await readBody(request)) as { content?: unknown; imageUrl?: unknown; parentId?: unknown };
        const content = typeof body.content === 'string' ? body.content.trim() : '';
        const imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl.trim() : '';
        if (!content && !imageUrl) throw new ContentHttpError(400, 'comment content or image is required');
        if (content.length > 1_000 || imageUrl.length > 255) throw new ContentHttpError(400, 'comment content or image is too long');
        const comment = await repository.createComment({ videoId: decodeURIComponent(commentsMatch[1]), principal, body: content, imageUrl: imageUrl || null, parentId: body.parentId === undefined || body.parentId === null ? null : String(body.parentId), requestId });
        const users = new Map([[principal.id, { id: principal.id, nickname: principal.nickname, avatarUrl: null }]]);
        void flushNotificationOutbox();
        writeJson(response, 200, ok({ ...publicComment(comment, users), replies: [] }, requestId), requestId);
        return;
      }

      const likeMatch = path.match(/^\/api\/v1\/videos\/([^/]+)\/like$/);
      if (likeMatch && (method === 'POST' || method === 'DELETE')) {
        const principal = requireContentPrincipal(request, requestId, internalJwtSecret);
        const result = await repository.setLike({ videoId: decodeURIComponent(likeMatch[1]), principal, liked: method === 'POST', requestId });
        void flushNotificationOutbox();
        writeJson(response, 200, ok(result, requestId), requestId);
        return;
      }

      const favoriteMatch = path.match(/^\/api\/v1\/videos\/([^/]+)\/favorite$/);
      if (favoriteMatch && (method === 'POST' || method === 'DELETE')) {
        const principal = requireContentPrincipal(request, requestId, internalJwtSecret);
        const body = method === 'POST' ? (await readBody(request)) as { folderId?: unknown } : {};
        const result = await repository.setFavorite({
          videoId: decodeURIComponent(favoriteMatch[1]),
          principal,
          folderId: body.folderId === undefined || body.folderId === null ? null : String(body.folderId),
          favorited: method === 'POST',
          requestId,
        });
        void flushNotificationOutbox();
        writeJson(response, 200, ok({ ...result, ...(result.folderId ? { folderId: publicId(result.folderId) } : {}) }, requestId), requestId);
        return;
      }

      const playMatch = path.match(/^\/api\/v1\/videos\/([^/]+)\/play$/);
      if (method === 'POST' && playMatch) {
        const principal = request.headers['x-gateway-authorization'] ? requireContentPrincipal(request, requestId, internalJwtSecret) : null;
        const body = (await readBody(request)) as { videoDurationSeconds?: unknown };
        const duration = body.videoDurationSeconds === undefined ? null : Number(body.videoDurationSeconds);
        if (duration !== null && (!Number.isInteger(duration) || duration < 0 || duration > 86_400)) throw new ContentHttpError(400, 'videoDurationSeconds is invalid');
        const result = await repository.recordPlay({ videoId: decodeURIComponent(playMatch[1]), principal, videoDurationSeconds: duration, requestId });
        writeJson(response, 200, ok({ ...result, videoId: publicId(result.videoId) }, requestId), requestId);
        return;
      }

      const watchMatch = path.match(/^\/api\/v1\/videos\/([^/]+)\/watch-progress$/);
      if (method === 'POST' && watchMatch) {
        const principal = requireContentPrincipal(request, requestId, internalJwtSecret);
        const body = (await readBody(request)) as { watchedSeconds?: unknown; currentTimeSeconds?: unknown; videoDurationSeconds?: unknown; event?: unknown };
        const watchedSeconds = Number(body.watchedSeconds);
        const currentTimeSeconds = Number(body.currentTimeSeconds);
        const videoDurationSeconds = body.videoDurationSeconds === undefined ? null : Number(body.videoDurationSeconds);
        if (!Number.isInteger(watchedSeconds) || watchedSeconds < 0 || !Number.isInteger(currentTimeSeconds) || currentTimeSeconds < 0 || (videoDurationSeconds !== null && (!Number.isInteger(videoDurationSeconds) || videoDurationSeconds < 0)) || !['pause', 'leave', 'ended'].includes(String(body.event))) {
          throw new ContentHttpError(400, 'watch progress payload is invalid');
        }
        const result = await repository.recordWatchProgress({ videoId: decodeURIComponent(watchMatch[1]), principal, watchedSeconds, currentTimeSeconds, videoDurationSeconds, event: body.event as 'pause' | 'leave' | 'ended', requestId });
        writeJson(response, 200, ok(result, requestId), requestId);
        return;
      }

      const danmakuMatch = path.match(/^\/api\/v1\/videos\/([^/]+)\/danmaku$/);
      if (danmakuMatch && method === 'GET') {
        const fromMs = Math.max(0, Number(url.searchParams.get('fromMs') ?? 0));
        const toMs = Math.min(86_400_000, Math.max(fromMs, Number(url.searchParams.get('toMs') ?? 600_000)));
        if (!Number.isFinite(fromMs) || !Number.isFinite(toMs)) throw new ContentHttpError(400, 'danmaku range is invalid');
        const items = await repository.listDanmaku(decodeURIComponent(danmakuMatch[1]), Math.floor(fromMs), Math.floor(toMs));
        const users = await identitySummaries(identityClient, items.map((item) => item.userId), requestId, identityTimeoutMs);
        writeJson(response, 200, ok(items.map((item) => publicDanmaku(item, users)), requestId), requestId);
        return;
      }
      if (danmakuMatch && method === 'POST') {
        const principal = requireContentPrincipal(request, requestId, internalJwtSecret);
        const body = (await readBody(request)) as { content?: unknown; timeOffsetMs?: unknown; color?: unknown };
        const content = typeof body.content === 'string' ? body.content.trim() : '';
        const timeOffsetMs = Number(body.timeOffsetMs);
        const color = typeof body.color === 'string' ? body.color.trim().toUpperCase() : '#FFFFFF';
        if (!content || content.length > 255 || !Number.isInteger(timeOffsetMs) || timeOffsetMs < 0 || timeOffsetMs > 86_400_000 || !/^#[0-9A-F]{6}$/.test(color)) throw new ContentHttpError(400, 'danmaku payload is invalid');
        const item = await repository.createDanmaku({ videoId: decodeURIComponent(danmakuMatch[1]), principal, body: content, timeOffsetMs, color, requestId });
        const users = new Map([[principal.id, { id: principal.id, nickname: principal.nickname, avatarUrl: null }]]);
        writeJson(response, 200, ok(publicDanmaku(item, users), requestId), requestId);
        return;
      }

      const videoDetailMatch = path.match(/^\/api\/v1\/videos\/([^/]+)$/);
      if (method === 'GET' && videoDetailMatch) {
        const video = await repository.findPublishedVideo(videoDetailMatch[1]);
        if (!video) {
          writeJson(response, 404, failure('video not found', requestId, 404), requestId);
          return;
        }
        const creators = await creatorSummaries(identityClient, [video], requestId, identityTimeoutMs);
        const principal = optionalTrustedContentPrincipal(request, requestId, internalJwtSecret);
        const viewer = principal ? await repository.viewerState(video.id, principal.id) : undefined;
        writeJson(response, 200, ok(publicVideoDetail(video, creators, viewer), requestId), requestId);
        return;
      }

      const recommendationsMatch = path.match(/^\/api\/v1\/videos\/([^/]+)\/recommendations$/);
      if (method === 'GET' && recommendationsMatch) {
        const fallback = await repository.listRelated(recommendationsMatch[1], normalizePageSize(url.searchParams.get('limit')));
        if (!fallback) {
          writeJson(response, 404, failure('video not found', requestId, 404), requestId);
          return;
        }
        const creators = await creatorSummaries(identityClient, fallback, requestId, identityTimeoutMs);
        writeJson(response, 200, ok(fallback.map((video) => publicVideo(video, creators)), requestId), requestId);
        return;
      }

      const reviewMatch = path.match(/^\/internal\/v1\/videos\/([^/]+)\/review-decision$/);
      if (method === 'POST' && reviewMatch) {
        if (!requireInternal(request, response, requestId, internalJwtSecret, 'internal:review-decision')) return;
        const body = (await readBody(request)) as { decisionId?: string; decision?: ReviewDecisionRecord['decision']; reason?: string };
        if (!body.decisionId || !body.decision) {
          writeJson(response, 400, failure('video, decisionId and decision are required', requestId, 400), requestId);
          return;
        }
        const result = await repository.applyReviewDecision({
          videoId: reviewMatch[1],
          decisionId: body.decisionId,
          decision: body.decision,
          reason: body.reason ?? null,
        });
        writeJson(response, result.ok ? 200 : result.status, result.ok ? ok(result.record, requestId) : failure(result.message, requestId, result.status), requestId);
        return;
      }

      const textStatusMatch = path.match(/^\/internal\/v1\/videos\/([^/]+)\/text-status$/);
      if (method === 'POST' && textStatusMatch) {
        if (!requireInternal(request, response, requestId, internalJwtSecret, 'internal:text-status')) return;
        const body = (await readBody(request)) as { targetType?: TextTargetType; targetId?: string; status?: TextStatus };
        if (!body.targetId || (body.targetType !== 'COMMENT' && body.targetType !== 'DANMAKU') || (body.status !== 'VISIBLE' && body.status !== 'HIDDEN')) {
          writeJson(response, 400, failure('target and valid status are required', requestId, 400), requestId);
          return;
        }
        const result = await repository.updateTextStatus({ videoId: textStatusMatch[1], targetType: body.targetType, targetId: body.targetId, status: body.status });
        writeJson(response, result.ok ? 200 : result.status, result.ok ? ok({ targetType: result.targetType, targetId: result.targetId, status: result.status }, requestId) : failure(result.message, requestId, result.status), requestId);
        return;
      }

      const moderationTargetMatch = path.match(/^\/internal\/v1\/moderation-targets\/(VIDEO|COMMENT|VIDEO_DANMAKU)\/([^/]+)$/);
      if (method === 'GET' && moderationTargetMatch) {
        if (!requireInternal(request, response, requestId, internalJwtSecret, 'internal:moderation-target-read')) return;
        const snapshot = await repository.moderationTarget(moderationTargetMatch[1] as ModerationTargetType, decodeURIComponent(moderationTargetMatch[2]));
        if (!snapshot) {
          writeJson(response, 404, failure('moderation target not found', requestId, 404), requestId);
          return;
        }
        writeJson(response, 200, ok(snapshot, requestId), requestId);
        return;
      }

      if (method === 'POST' && path === '/internal/v1/replays') {
        if (!requireInternal(request, response, requestId, internalJwtSecret, 'internal:replay')) return;
        const body = (await readBody(request)) as { requestId?: string; objectKey?: string; mimeType?: string; title?: string; creatorId?: string };
        if (!body.requestId || !body.objectKey || !['video/webm', 'video/mp4'].includes(body.mimeType ?? '')) {
          writeJson(response, 400, failure('requestId, objectKey and supported replay mimeType are required', requestId, 400), requestId);
          return;
        }
        const result = await repository.registerReplay({
          requestId: body.requestId,
          objectKey: body.objectKey,
          mimeType: body.mimeType as 'video/webm' | 'video/mp4',
          title: body.title ?? 'Live replay',
          creatorId: body.creatorId ?? '0',
        });
        writeJson(response, result.ok ? (result.replayed ? 200 : 201) : result.status, result.ok ? ok(result.record, requestId) : failure(result.message, requestId, result.status), requestId);
        return;
      }

      if (method === 'POST' && path === '/internal/v1/videos/batch-summary') {
        if (!requireInternal(request, response, requestId, internalJwtSecret, 'internal:video-summary')) return;
        const body = (await readBody(request)) as { ids?: string[] };
        const ids = Array.isArray(body.ids) ? body.ids : [];
        const items = await repository.batchSummary(ids);
        writeJson(response, 200, ok({ items }, requestId), requestId);
        return;
      }

      writeJson(response, 404, failure('route not implemented in content-media foundation', requestId, 404), requestId);
    } catch (error) {
      const status = error instanceof ContentHttpError ? error.status : 500;
      writeJson(response, status, failure(error instanceof Error ? error.message : 'internal error', requestId, status), requestId);
    }
  });

  const retryIntervalMs = Math.max(500, Number(process.env.CONTENT_NOTIFICATION_RETRY_INTERVAL_MS ?? 1_000) || 1_000);
  const notificationTimer = setInterval(() => void flushNotificationOutbox(), retryIntervalMs);
  notificationTimer.unref();
  server.on('close', () => clearInterval(notificationTimer));
  return server;
}
