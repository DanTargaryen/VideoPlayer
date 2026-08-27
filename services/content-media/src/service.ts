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
  type ServiceRuntimeOptions,
  type ServiceStatus,
  type ServiceVersion,
} from '@videoplayer/shared-contracts';

export const SERVICE_OPTIONS: ServiceRuntimeOptions = {
  serviceName: 'content-media',
  defaultPort: 3102,
};

type VideoStatus = 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'REJECTED' | 'HIDDEN';
type AssetKind = 'ORIGINAL' | 'TRANSCODED' | 'COVER' | 'REPLAY';
type TextTargetType = 'COMMENT' | 'DANMAKU';
type TextStatus = 'VISIBLE' | 'HIDDEN';

interface CreatorSummary {
  id: string;
  nickname: string;
  avatarUrl: string | null;
  unavailable?: boolean;
}

interface VideoRecord {
  id: string;
  title: string;
  description: string;
  creatorId: string;
  categoryId: string;
  status: VideoStatus;
  coverUrl: string | null;
  playUrl: string | null;
  durationSeconds: number;
  publishedAt: string | null;
  tags: string[];
  playCount: number;
  likeCount: number;
  favoriteCount: number;
}

interface VideoAssetRecord {
  id: string;
  videoId: string;
  kind: AssetKind;
  objectKey: string;
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
  contentVideoId: string;
  assetId: string;
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
  internalJwtSecret?: string;
  identityTimeoutMs?: number;
  state?: ContentState;
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

const DEFAULT_IDENTITY_TIMEOUT_MS = 1000;

export function createFixtureState(): ContentState {
  return {
    videos: [
      {
        id: 'video-001',
        title: 'Spring Architecture Notes',
        description: 'A published content fixture for recommendation, search and detail contracts.',
        creatorId: 'user-001',
        categoryId: 'backend',
        status: 'PUBLISHED',
        coverUrl: 'https://cdn.example.test/covers/video-001.jpg',
        playUrl: 'https://cdn.example.test/videos/video-001.mp4',
        durationSeconds: 92,
        publishedAt: '2026-08-27T02:00:00.000Z',
        tags: ['architecture', 'spring'],
        playCount: 410,
        likeCount: 39,
        favoriteCount: 12,
      },
      {
        id: 'video-002',
        title: 'Media Pipeline Smoke',
        description: 'Published video used as related recommendation.',
        creatorId: 'user-002',
        categoryId: 'media',
        status: 'PUBLISHED',
        coverUrl: 'https://cdn.example.test/covers/video-002.jpg',
        playUrl: 'https://cdn.example.test/videos/video-002.mp4',
        durationSeconds: 121,
        publishedAt: '2026-08-27T03:00:00.000Z',
        tags: ['media', 'ffprobe'],
        playCount: 220,
        likeCount: 18,
        favoriteCount: 8,
      },
      {
        id: 'video-draft',
        title: 'Draft Upload Is Private',
        description: 'Draft fixture must not leak to public read APIs.',
        creatorId: 'user-001',
        categoryId: 'media',
        status: 'DRAFT',
        coverUrl: null,
        playUrl: null,
        durationSeconds: 0,
        publishedAt: null,
        tags: ['draft'],
        playCount: 0,
        likeCount: 0,
        favoriteCount: 0,
      },
    ],
    assets: [
      {
        id: 'asset-001',
        videoId: 'video-001',
        kind: 'TRANSCODED',
        objectKey: 'videos/video-001.mp4',
        bucket: 'videoplayer-content',
        mimeType: 'video/mp4',
        url: 'https://cdn.example.test/videos/video-001.mp4',
      },
    ],
    comments: [{ id: 'comment-001', videoId: 'video-001', userId: 'user-002', body: 'clear walkthrough', status: 'VISIBLE' }],
    danmaku: [{ id: 'danmaku-001', videoId: 'video-001', userId: 'user-002', body: 'nice', status: 'VISIBLE' }],
    reviewDecisions: [],
    replays: [],
    deletedObjects: [],
  };
}

export class MockIdentityBatchClient implements IdentityBatchClient {
  private readonly summaries = new Map<string, CreatorSummary>([
    ['user-001', { id: 'user-001', nickname: 'Creator One', avatarUrl: 'https://cdn.example.test/users/one.png' }],
    ['user-002', { id: 'user-002', nickname: 'Creator Two', avatarUrl: null }],
  ]);

  async batchSummary(userIds: string[]): Promise<Map<string, CreatorSummary>> {
    return new Map(userIds.map((id) => [id, this.summaries.get(id) ?? fallbackCreatorSummary(id)]));
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
  return {
    id: video.id,
    title: video.title,
    description: video.description,
    status: video.status,
    categoryId: video.categoryId,
    coverUrl: video.coverUrl,
    playUrl: video.playUrl,
    durationSeconds: video.durationSeconds,
    publishedAt: video.publishedAt,
    tags: video.tags,
    counters: {
      plays: video.playCount,
      likes: video.likeCount,
      favorites: video.favoriteCount,
    },
    creator: creators.get(video.creatorId) ?? fallbackCreatorSummary(video.creatorId),
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

function serviceStatus(startedAt: number, status: 'live' | 'ready'): ServiceStatus {
  return {
    service: 'content-media',
    status,
    version: process.env.GIT_SHA?.trim() || process.env.SERVICE_VERSION?.trim() || 'dev',
    uptimeSeconds: Math.max(0, Math.floor((Date.now() - startedAt) / 1000)),
  };
}

export function createContentService(options: ContentServiceOptions = {}): Server {
  const state = options.state ?? createFixtureState();
  const identityClient = options.identityClient ?? new MockIdentityBatchClient();
  const internalJwtSecret = options.internalJwtSecret ?? process.env.SERVICE_JWT_SECRET ?? '';
  const identityTimeoutMs = options.identityTimeoutMs ?? DEFAULT_IDENTITY_TIMEOUT_MS;
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
        writeJson(response, 200, ok(serviceStatus(startedAt, 'ready'), requestId), requestId);
        return;
      }
      if (method === 'GET' && path === '/version') {
        const version: ServiceVersion = { service: 'content-media', version: serviceStatus(startedAt, 'live').version, node: process.version };
        writeJson(response, 200, ok(version, requestId), requestId);
        return;
      }

      if (method === 'GET' && path === '/api/v1/feeds/recommend') {
        const videos = publishedVideos(state).sort((left, right) => right.playCount - left.playCount);
        const creators = await creatorSummaries(identityClient, videos, requestId, identityTimeoutMs);
        writeJson(response, 200, ok({ items: videos.map((video) => publicVideo(video, creators)) }, requestId), requestId);
        return;
      }

      if (method === 'GET' && path === '/api/v1/search/all') {
        const keyword = (url.searchParams.get('keyword') ?? url.searchParams.get('q') ?? '').trim().toLowerCase();
        const videos = publishedVideos(state).filter(
          (video) => !keyword || `${video.title} ${video.description} ${video.tags.join(' ')}`.toLowerCase().includes(keyword),
        );
        const creators = await creatorSummaries(identityClient, videos, requestId, identityTimeoutMs);
        writeJson(response, 200, ok({ keyword, videos: videos.map((video) => publicVideo(video, creators)) }, requestId), requestId);
        return;
      }

      const videoDetailMatch = path.match(/^\/api\/v1\/videos\/([^/]+)$/);
      if (method === 'GET' && videoDetailMatch) {
        const video = state.videos.find((item) => item.id === videoDetailMatch[1]);
        if (!video || video.status !== 'PUBLISHED') {
          writeJson(response, 404, failure('video not found', requestId, 404), requestId);
          return;
        }
        const creators = await creatorSummaries(identityClient, [video], requestId, identityTimeoutMs);
        writeJson(response, 200, ok({ video: publicVideo(video, creators), assets: state.assets.filter((asset) => asset.videoId === video.id) }, requestId), requestId);
        return;
      }

      const recommendationsMatch = path.match(/^\/api\/v1\/videos\/([^/]+)\/recommendations$/);
      if (method === 'GET' && recommendationsMatch) {
        const base = state.videos.find((video) => video.id === recommendationsMatch[1] && video.status === 'PUBLISHED');
        if (!base) {
          writeJson(response, 404, failure('video not found', requestId, 404), requestId);
          return;
        }
        const related = publishedVideos(state).filter((video) => video.id !== base.id && video.categoryId === base.categoryId);
        const fallback = related.length ? related : publishedVideos(state).filter((video) => video.id !== base.id);
        const creators = await creatorSummaries(identityClient, fallback, requestId, identityTimeoutMs);
        writeJson(response, 200, ok({ items: fallback.map((video) => publicVideo(video, creators)) }, requestId), requestId);
        return;
      }

      const reviewMatch = path.match(/^\/internal\/v1\/videos\/([^/]+)\/review-decision$/);
      if (method === 'POST' && reviewMatch) {
        if (!requireInternal(request, response, requestId, internalJwtSecret, 'internal:review-decision')) return;
        const body = (await readBody(request)) as { decisionId?: string; decision?: ReviewDecisionRecord['decision']; reason?: string };
        const existing = state.reviewDecisions.find((decision) => decision.decisionId === body.decisionId);
        if (existing) {
          writeJson(response, 200, ok(existing, requestId), requestId);
          return;
        }
        const video = state.videos.find((item) => item.id === reviewMatch[1]);
        if (!video || !body.decisionId || !body.decision) {
          writeJson(response, 400, failure('video, decisionId and decision are required', requestId, 400), requestId);
          return;
        }
        video.status = body.decision === 'APPROVED' ? 'PUBLISHED' : body.decision === 'HIDDEN' ? 'HIDDEN' : 'REJECTED';
        const record: ReviewDecisionRecord = {
          decisionId: body.decisionId,
          videoId: video.id,
          decision: body.decision,
          appliedStatus: video.status,
          reason: body.reason ?? null,
        };
        state.reviewDecisions.push(record);
        writeJson(response, 200, ok(record, requestId), requestId);
        return;
      }

      const textStatusMatch = path.match(/^\/internal\/v1\/videos\/([^/]+)\/text-status$/);
      if (method === 'POST' && textStatusMatch) {
        if (!requireInternal(request, response, requestId, internalJwtSecret, 'internal:text-status')) return;
        const body = (await readBody(request)) as { targetType?: TextTargetType; targetId?: string; status?: TextStatus };
        const collection = body.targetType === 'DANMAKU' ? state.danmaku : state.comments;
        const target = collection.find((item) => item.id === body.targetId && item.videoId === textStatusMatch[1]);
        if (!target || (body.status !== 'VISIBLE' && body.status !== 'HIDDEN')) {
          writeJson(response, 400, failure('target and valid status are required', requestId, 400), requestId);
          return;
        }
        target.status = body.status;
        writeJson(response, 200, ok({ targetType: body.targetType ?? 'COMMENT', targetId: target.id, status: target.status }, requestId), requestId);
        return;
      }

      if (method === 'POST' && path === '/internal/v1/replays') {
        if (!requireInternal(request, response, requestId, internalJwtSecret, 'internal:replay')) return;
        const body = (await readBody(request)) as { requestId?: string; objectKey?: string; mimeType?: string; title?: string; creatorId?: string };
        const existing = state.replays.find((replay) => replay.requestId === body.requestId || replay.objectKey === body.objectKey);
        if (existing) {
          writeJson(response, 200, ok(existing, requestId), requestId);
          return;
        }
        if (!body.requestId || !body.objectKey || !['video/webm', 'video/mp4'].includes(body.mimeType ?? '')) {
          writeJson(response, 400, failure('requestId, objectKey and supported replay mimeType are required', requestId, 400), requestId);
          return;
        }
        const video: VideoRecord = {
          id: `replay-${state.replays.length + 1}`,
          title: body.title ?? 'Live replay',
          description: 'Replay registered by live-reward internal API.',
          creatorId: body.creatorId ?? 'external-live-user',
          categoryId: 'live',
          status: 'DRAFT',
          coverUrl: null,
          playUrl: `https://cdn.example.test/${body.objectKey}`,
          durationSeconds: 0,
          publishedAt: null,
          tags: ['replay'],
          playCount: 0,
          likeCount: 0,
          favoriteCount: 0,
        };
        const requestKey = body.requestId as string;
        const objectKey = body.objectKey as string;
        const mimeType = body.mimeType as 'video/webm' | 'video/mp4';
        const asset: VideoAssetRecord = {
          id: `replay-asset-${state.replays.length + 1}`,
          videoId: video.id,
          kind: 'REPLAY',
          objectKey,
          bucket: 'videoplayer-content',
          mimeType,
          url: video.playUrl ?? '',
        };
        const replay: ReplayRecord = { requestId: requestKey, objectKey, contentVideoId: video.id, assetId: asset.id };
        state.videos.push(video);
        state.assets.push(asset);
        state.replays.push(replay);
        writeJson(response, 201, ok(replay, requestId), requestId);
        return;
      }

      if (method === 'POST' && path === '/internal/v1/videos/batch-summary') {
        if (!requireInternal(request, response, requestId, internalJwtSecret, 'internal:video-summary')) return;
        const body = (await readBody(request)) as { ids?: string[] };
        const ids = Array.isArray(body.ids) ? body.ids : [];
        const items = ids.map((id) => {
          const video = state.videos.find((item) => item.id === id && item.status === 'PUBLISHED');
          return video ? { id, found: true, title: video.title, coverUrl: video.coverUrl, status: video.status } : { id, found: false };
        });
        writeJson(response, 200, ok({ items }, requestId), requestId);
        return;
      }

      writeJson(response, 404, failure('route not implemented in content-media foundation', requestId, 404), requestId);
    } catch (error) {
      writeJson(response, 500, failure(error instanceof Error ? error.message : 'internal error', requestId, 500), requestId);
    }
  });
}
