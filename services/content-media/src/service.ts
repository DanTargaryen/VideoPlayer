import { randomUUID } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

import {
  authorizeServiceRequest,
  failure,
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

export const SERVICE_OPTIONS: ServiceRuntimeOptions = {
  serviceName: 'content-media',
  defaultPort: 3102,
};

type VideoStatus = 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'REJECTED' | 'HIDDEN';
type AssetKind = 'ORIGINAL' | 'TRANSCODED' | 'COVER' | 'REPLAY';
type TextTargetType = 'COMMENT' | 'DANMAKU';
type TextStatus = 'VISIBLE' | 'HIDDEN';

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
  status: VideoStatus;
  coverUrl: string | null;
  playUrl: string | null;
  durationSeconds: number;
  publishedAt: string | null;
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
  body: string;
  status: TextStatus;
}

interface DanmakuRecord {
  id: string;
  videoId: string;
  userId: string;
  body: string;
  status: TextStatus;
}

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
  submitReview(input: { videoId: string; userId: string; isAdmin: boolean }): Promise<
    | { ok: true; previousStatus: 'DRAFT' | 'REJECTED' }
    | { ok: false; status: 403 | 404 | 409; message: string }
  >;
  rollbackReviewSubmission(videoId: string, previousStatus: 'DRAFT' | 'REJECTED'): Promise<void>;
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
    comments: [{ id: 'comment-001', videoId: '1', userId: '2', body: 'clear walkthrough', status: 'VISIBLE' }],
    danmaku: [{ id: 'danmaku-001', videoId: '1', userId: '2', body: 'nice', status: 'VISIBLE' }],
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

  async submitReview(input: { videoId: string; userId: string; isAdmin: boolean }) {
    const video = this.state.videos.find((item) => item.id === input.videoId);
    if (!video) return { ok: false as const, status: 404 as const, message: 'video not found' };
    if (!input.isAdmin && video.creatorId !== input.userId) {
      return { ok: false as const, status: 403 as const, message: 'only the creator can submit this video for review' };
    }
    if (video.status !== 'DRAFT' && video.status !== 'REJECTED') {
      return { ok: false as const, status: 409 as const, message: 'only draft or rejected videos can be submitted for review' };
    }
    const previousStatus = video.status;
    video.status = 'PENDING_REVIEW';
    return { ok: true as const, previousStatus };
  }

  async rollbackReviewSubmission(videoId: string, previousStatus: 'DRAFT' | 'REJECTED'): Promise<void> {
    const video = this.state.videos.find((item) => item.id === videoId);
    if (video?.status === 'PENDING_REVIEW') video.status = previousStatus;
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
}

type RawVideo = {
  id: string;
  title: string;
  description: string;
  creatorId: string;
  categoryId: string | null;
  status: VideoStatus;
  coverUrl: string | null;
  playUrl: string | null;
  durationSeconds: number;
  publishedAt: Date | string | null;
  createdAt: Date | string;
  categoryCode: string | null;
  categoryName: string | null;
  playCount: bigint | number | null;
  likeCount: bigint | number | null;
  favoriteCount: bigint | number | null;
  commentCount: bigint | number | null;
};

interface PrismaLike {
  $queryRawUnsafe<T = unknown>(query: string, ...values: Array<string | number | null>): Promise<T>;
  $executeRawUnsafe(query: string, ...values: Array<string | number | null>): Promise<number>;
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

  async ready(): Promise<boolean> {
    try {
      await (await this.client()).$queryRawUnsafe('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  async listRecommended(options: { page: number; pageSize: number; categoryCode?: string }): Promise<VideoRecord[]> {
    const whereCategory = options.categoryCode ? 'AND c.`code` = ?' : '';
    const params = options.categoryCode ? [options.categoryCode, offset(options), options.pageSize] : [offset(options), options.pageSize];
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
      clauses.push('c.`code` = ?');
      params.push(options.categoryCode);
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

  async submitReview(input: { videoId: string; userId: string; isAdmin: boolean }) {
    const rows = await (await this.client()).$queryRawUnsafe<Array<{ creatorId: string; status: VideoStatus }>>(
      'SELECT creatorId, status FROM `Video` WHERE id = ? LIMIT 1',
      input.videoId,
    );
    const video = rows[0];
    if (!video) return { ok: false as const, status: 404 as const, message: 'video not found' };
    if (!input.isAdmin && video.creatorId !== input.userId) {
      return { ok: false as const, status: 403 as const, message: 'only the creator can submit this video for review' };
    }
    if (video.status !== 'DRAFT' && video.status !== 'REJECTED') {
      return { ok: false as const, status: 409 as const, message: 'only draft or rejected videos can be submitted for review' };
    }
    const updated = input.isAdmin
      ? await (await this.client()).$executeRawUnsafe(
          "UPDATE `Video` SET status = 'PENDING_REVIEW' WHERE id = ? AND status = ?",
          input.videoId,
          video.status,
        )
      : await (await this.client()).$executeRawUnsafe(
          "UPDATE `Video` SET status = 'PENDING_REVIEW' WHERE id = ? AND creatorId = ? AND status = ?",
          input.videoId,
          input.userId,
          video.status,
        );
    if (updated !== 1) {
      return { ok: false as const, status: 409 as const, message: 'video state changed while submitting for review' };
    }
    return { ok: true as const, previousStatus: video.status };
  }

  async rollbackReviewSubmission(videoId: string, previousStatus: 'DRAFT' | 'REJECTED'): Promise<void> {
    await (await this.client()).$executeRawUnsafe(
      "UPDATE `Video` SET status = ? WHERE id = ? AND status = 'PENDING_REVIEW'",
      previousStatus,
      videoId,
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
      updated = await (await this.client()).$executeRawUnsafe(
        'UPDATE `Video` SET status = ?, reviewDecisionId = ?, reviewDecision = ?, reviewDecisionReason = ? WHERE id = ?',
        nextStatus,
        input.decisionId,
        input.decision,
        input.reason,
        input.videoId,
      );
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
      }>>('SELECT id, title, description, status, creatorId, coverUrl, playUrl, durationSeconds, createdAt, publishedAt FROM `Video` WHERE id = ? LIMIT 1', targetId);
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
    SELECT v.id, v.title, v.description, v.creatorId, v.categoryId, v.status, v.coverUrl, v.playUrl,
           v.durationSeconds, v.publishedAt, v.createdAt, c.code AS categoryCode, c.name AS categoryName,
           COALESCE(w.plays, 0) AS playCount, COALESCE(l.likes, 0) AS likeCount,
           COALESCE(f.favorites, 0) AS favoriteCount, COALESCE(cm.comments, 0) AS commentCount
    FROM Video v
    LEFT JOIN VideoCategory c ON c.id = v.categoryId
    LEFT JOIN (SELECT videoId, COUNT(*) AS plays FROM UserVideoWatch GROUP BY videoId) w ON w.videoId = v.id
    LEFT JOIN (SELECT videoId, COUNT(*) AS likes FROM VideoLike GROUP BY videoId) l ON l.videoId = v.id
    LEFT JOIN (SELECT videoId, COUNT(*) AS favorites FROM Favorite GROUP BY videoId) f ON f.videoId = v.id
    LEFT JOIN (SELECT videoId, COUNT(*) AS comments FROM Comment WHERE status = 'VISIBLE' GROUP BY videoId) cm ON cm.videoId = v.id
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
    status: row.status,
    coverUrl: row.coverUrl,
    playUrl: row.playUrl,
    durationSeconds: row.durationSeconds,
    publishedAt: toIso(row.publishedAt),
    tags: [],
    playCount: Number(row.playCount ?? 0),
    likeCount: Number(row.likeCount ?? 0),
    favoriteCount: Number(row.favoriteCount ?? 0),
    commentCount: Number(row.commentCount ?? 0),
    coinCount: 0,
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

function publicVideo(video: VideoRecord, creators: Map<string, CreatorSummary>) {
  const creator = creators.get(video.creatorId) ?? fallbackCreatorSummary(video.creatorId);
  const numericId = Number(video.id);
  const numericCreatorId = Number(video.creatorId);
  return {
    id: Number.isSafeInteger(numericId) ? numericId : video.id,
    title: video.title,
    description: video.description,
    status: video.status,
    category: video.categoryCode ?? undefined,
    categories: video.categoryCode ? [video.categoryCode] : [],
    coverUrl: video.coverUrl,
    playUrl: video.playUrl,
    durationSeconds: video.durationSeconds,
    publishedAt: video.publishedAt,
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

function publicVideoDetail(video: VideoRecord, creators: Map<string, CreatorSummary>) {
  const card = publicVideo(video, creators);
  const creator = card.creator;
  return {
    ...card,
    uploadToken: '',
    rejectReason: null,
    submittedAt: null,
    updatedAt: video.createdAt,
    creator: {
      id: creator.id,
      nickname: creator.nickname,
      avatarUrl: creator.avatarUrl,
      role: 'USER',
      followerCount: 0,
    },
    isFollowingCreator: false,
    isLiked: false,
    isFavorited: false,
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

function trustedContentPrincipal(request: IncomingMessage, requestId: string, secret: string): { id: string; isAdmin: boolean } {
  const claims = authorizeServiceRequest(request.headers['x-gateway-authorization'], {
    audience: 'content-media',
    secret,
    requiredScopes: ['content.user.forward'],
    allowedCallers: ['gateway'],
  });
  if (claims.requestId !== requestId) throw new Error('Gateway JWT requestId does not match x-request-id');
  const rawId = String(request.headers['x-user-id'] ?? '').trim();
  const role = String(request.headers['x-user-role'] ?? 'USER').trim().toUpperCase();
  const id = Number(rawId);
  if (!Number.isSafeInteger(id) || id < 1) throw new Error('Trusted user context is invalid');
  return { id: String(id), isAdmin: role === 'ADMIN' };
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
  const identityClient = options.identityClient ?? new MockIdentityBatchClient();
  const internalJwtSecret = options.internalJwtSecret ?? process.env.SERVICE_JWT_SECRET ?? '';
  const identityTimeoutMs = options.identityTimeoutMs ?? DEFAULT_IDENTITY_TIMEOUT_MS;
  const governanceBaseUrl = process.env.GOVERNANCE_SERVICE_URL?.trim();
  const governanceClient = options.governanceClient === undefined
    ? governanceBaseUrl
      ? new HttpGovernanceReviewClient({ baseUrl: governanceBaseUrl, jwtSecret: internalJwtSecret, timeoutMs: options.governanceTimeoutMs })
      : null
    : options.governanceClient;
  const startedAt = Date.now();

  return createServer(async (request, response) => {
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
        const transition = await repository.submitReview({ videoId, userId: principal.id, isAdmin: principal.isAdmin });
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
          await repository.rollbackReviewSubmission(videoId, transition.previousStatus);
          const status = error instanceof GovernanceReviewError && !error.unavailable ? 502 : 503;
          writeJson(response, status, failure(error instanceof Error ? error.message : 'governance review submission failed', requestId, status), requestId);
        }
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
        writeJson(response, 200, ok(publicVideoDetail(video, creators), requestId), requestId);
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
      writeJson(response, 500, failure(error instanceof Error ? error.message : 'internal error', requestId, 500), requestId);
    }
  });
}
