import { randomUUID } from 'node:crypto';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';

import { failure, issueServiceToken, ok, verifyServiceToken, writeServiceLog } from '@videoplayer/shared-contracts';

import { createStore, type MessageRecord, type ReplayRecord, type RoomRecord, type RoomStatus, type SessionRecord, type SourceMode, type Store } from './store.js';

type User = { id: number; nickname: string };
type SrsExchange = { type: 'offer' | 'answer'; sdp: string };
type SrsResponse = { type: 'answer'; sdp: string; sessionId: string | null; server: string | null };

export interface SrsClient {
  probe(): Promise<void>;
  exchange(action: 'publish' | 'play', streamKey: string, offer: SrsExchange): Promise<SrsResponse>;
}

export interface ReplayClient {
  register(input: { sessionId: number; objectKey: string; mimeType: string | null; requestId: string }): Promise<{ contentVideoId: number }>;
}

export interface LiveAppOptions {
  store?: Store;
  srs?: SrsClient;
  replayClient?: ReplayClient;
  now?: () => Date;
}

export class HttpError extends Error {
  constructor(readonly status: number, message: string, readonly code = status) { super(message); }
}

export class DisabledSrsClient implements SrsClient {
  async probe(): Promise<void> {}
  async exchange(): Promise<SrsResponse> { throw new HttpError(503, 'SRS service is not configured', 503); }
}

export class FetchSrsClient implements SrsClient {
  constructor(private readonly apiBase: string, private readonly webRtcBase: string, private readonly timeoutMs = 2000) {}
  async probe(): Promise<void> {
    const response = await this.fetch('/api/v1/streams/');
    if (!response.ok) throw new HttpError(503, `SRS service returned ${response.status}`, 503);
  }
  async exchange(action: 'publish' | 'play', streamKey: string, offer: SrsExchange): Promise<SrsResponse> {
    const api = `${this.apiBase}/rtc/v1/${action}/`;
    const response = await this.fetch(`/rtc/v1/${action}/`, {
      method: 'POST',
      body: JSON.stringify({ api, streamurl: `${this.webRtcBase}/${streamKey}`, clientip: null, sdp: offer.sdp }),
    });
    if (!response.ok) throw new HttpError(503, `SRS request failed with status ${response.status}`, 503);
    const payload = await response.json() as { code?: number; sdp?: string; sessionid?: string; server?: string };
    if (payload.code !== 0 || !payload.sdp) throw new HttpError(503, 'SRS SDP exchange failed', 503);
    return { type: 'answer', sdp: payload.sdp, sessionId: payload.sessionid ?? null, server: payload.server ?? null };
  }
  private async fetch(path: string, init: RequestInit = {}): Promise<Response> {
    try {
      return await globalThis.fetch(`${this.apiBase}${path}`, { ...init, headers: { 'content-type': 'application/json', ...(init.headers ?? {}) }, signal: AbortSignal.timeout(this.timeoutMs) });
    } catch (error) {
      if (error instanceof HttpError) throw error;
      if (error instanceof Error && error.name === 'TimeoutError') throw new HttpError(504, 'SRS request timed out after 2000ms', 504);
      throw new HttpError(503, 'SRS service is unavailable', 503);
    }
  }
}

export class ContentReplayClient implements ReplayClient {
  constructor(private readonly baseUrl: string, private readonly timeoutMs = 5000) {}
  async register(input: { sessionId: number; objectKey: string; mimeType: string | null; requestId: string }): Promise<{ contentVideoId: number }> {
    const secret = process.env.SERVICE_JWT_SECRET;
    if (!secret?.trim()) throw new HttpError(503, 'Internal service authentication is not configured', 503);
    const headers: Record<string, string> = { 'content-type': 'application/json', 'x-request-id': input.requestId };
    headers.authorization = `Bearer ${issueServiceToken({ caller: 'live-reward', audience: 'content-media', scopes: ['content.replays.write'], secret, requestId: input.requestId })}`;
    try {
      const response = await fetch(`${this.baseUrl}/internal/v1/replays`, { method: 'POST', headers, body: JSON.stringify(input), signal: AbortSignal.timeout(this.timeoutMs) });
      if (!response.ok) throw new HttpError(503, `content-media returned ${response.status}`, 503);
      const payload = await response.json() as { data?: { contentVideoId?: number } };
      const contentVideoId = payload.data?.contentVideoId;
      if (!Number.isInteger(contentVideoId)) throw new HttpError(503, 'content-media returned an invalid replay ID', 503);
      return { contentVideoId: contentVideoId! };
    } catch (error) {
      if (error instanceof HttpError) throw error;
      if (error instanceof Error && error.name === 'TimeoutError') throw new HttpError(504, 'content-media replay registration timed out after 5000ms', 504);
      throw new HttpError(503, 'content-media is unavailable', 503);
    }
  }
}

export class LiveApplication {
  readonly store: Store;
  private readonly srs: SrsClient;
  private readonly replayClient: ReplayClient;
  private readonly now: () => Date;
  private readonly srsRequired: boolean;
  private readonly viewerIds = new Map<number, Set<string>>();

  constructor(options: LiveAppOptions = {}) {
    this.store = options.store ?? createStore();
    this.srs = options.srs ?? buildSrsClient();
    this.srsRequired = Boolean(options.srs) || this.isSrsConfigured();
    this.replayClient = options.replayClient ?? buildReplayClient();
    this.now = options.now ?? (() => new Date());
  }

  async close(): Promise<void> { await this.store.close(); }
  async ready(): Promise<boolean> { return this.store.ready(); }

  async createRoom(user: User, input: { title: string; category?: string; coverUrl?: string; sourceMode?: SourceMode }) {
    const title = input.title?.trim();
    if (!title) throw new HttpError(400, 'title is required', 400);
    const roomId = randomUUID().replaceAll('-', '').slice(0, 20);
    const streamKey = `room-${roomId}`;
    const room = await this.store.createRoom({ broadcasterId: user.id, title: title.slice(0, 128), category: input.category?.trim() || 'live', coverUrl: input.coverUrl?.trim() || null, sourceMode: input.sourceMode ?? 'camera', streamKey, rtmpUrl: `${baseUrl('SRS_RTMP_BASE', 'rtmp://127.0.0.1/live')}/${streamKey}`, playUrl: `${baseUrl('SRS_PLAY_BASE', 'http://127.0.0.1:8080/live')}/${streamKey}.flv`, status: 'IDLE' });
    return serializeRoom(room, 0, null);
  }

  async listRooms(query: { status?: string; category?: string; broadcasterId?: number; keyword?: string; limit?: number }) {
    let rooms = await this.store.listRooms();
    const keyword = query.keyword?.trim().toLowerCase();
    rooms = rooms.filter((room) => (!query.status || room.status === query.status) && (!query.category || room.category === query.category) && (!query.broadcasterId || room.broadcasterId === query.broadcasterId) && (!keyword || `${room.title} ${room.category}`.toLowerCase().includes(keyword)));
    rooms.sort((a, b) => statusOrder(a.status) - statusOrder(b.status) || b.createdAt.getTime() - a.createdAt.getTime());
    const limit = clampLimit(query.limit);
    return Promise.all(rooms.slice(0, limit).map(async (room) => serializeRoom(room, await this.activeViewerCount(room.id), await this.latestSession(room.id))));
  }

  async getRoom(id: number) {
    const room = await this.requireRoom(id);
    return serializeRoom(room, await this.activeViewerCount(id), await this.latestSession(id));
  }

  async startRoom(id: number, user: User) {
    const room = await this.requireOwnedRoom(id, user.id);
    if (room.status === 'LIVING') throw new HttpError(409, 'Live room is already active', 409);
    if (this.srsRequired) await this.srs.probe();
    const session = await this.store.createSession({ roomId: id, status: 'LIVING', sourceMode: room.sourceMode, startedAt: this.now(), endedAt: null, replayStatus: 'NONE' });
    await this.store.updateRoom(id, { status: 'LIVING', updatedAt: this.now() });
    this.viewerIds.set(session.id, new Set());
    await this.store.addMessage({ sessionId: session.id, senderId: null, kind: 'SYSTEM', content: '直播已开始' });
    return { roomId: id, sessionId: session.id, status: 'LIVING' };
  }

  async stopRoom(id: number, user: User) {
    const room = await this.requireOwnedRoom(id, user.id);
    const session = await this.latestSession(id);
    if (room.status !== 'LIVING' || !session || session.status !== 'LIVING') throw new HttpError(409, 'Live room is not active', 409);
    const endedAt = this.now();
    await this.store.updateSession(session.id, { status: 'ENDED', endedAt, replayStatus: 'PENDING' });
    await this.store.updateRoom(id, { status: 'ENDED', updatedAt: endedAt });
    await this.store.addMessage({ sessionId: session.id, senderId: null, kind: 'SYSTEM', content: '直播已结束' });
    this.viewerIds.delete(session.id);
    return { roomId: id, sessionId: session.id, status: 'ENDED', replayStatus: 'PENDING' };
  }

  async getSession(id: number) {
    const session = await this.store.getSession(id);
    if (!session) throw new HttpError(404, 'Live session not found', 404);
    return { ...session, startedAt: session.startedAt.toISOString(), endedAt: session.endedAt?.toISOString() ?? null, viewerCount: await this.activeViewerCountBySession(id), replay: await this.store.getReplayBySession(id) };
  }

  async addViewer(roomId: number, viewerId?: string) {
    const room = await this.requireRoom(roomId);
    if (room.status !== 'LIVING') throw new HttpError(409, 'Live room is not active', 409);
    const session = await this.requireActiveSession(roomId);
    const id = viewerId?.trim().slice(0, 128) || randomUUID();
    const viewers = this.viewerIds.get(session.id) ?? new Set(await this.store.listActiveViewers(session.id));
    viewers.add(id); this.viewerIds.set(session.id, viewers);
    await this.store.addViewerEvent({ sessionId: session.id, viewerId: id, eventType: 'JOIN' });
    return { roomId, sessionId: session.id, viewerId: id, status: room.status };
  }

  async removeViewer(roomId: number, viewerId: string) {
    const session = await this.requireActiveSession(roomId);
    const viewers = this.viewerIds.get(session.id) ?? new Set(await this.store.listActiveViewers(session.id));
    if (!viewers?.has(viewerId)) throw new HttpError(404, 'Viewer not found', 404);
    viewers.delete(viewerId);
    await this.store.addViewerEvent({ sessionId: session.id, viewerId, eventType: 'LEAVE' });
    return { roomId, viewerId, removed: true };
  }

  async listMessages(roomId: number) { const session = await this.latestSession(roomId); return session ? (await this.store.listMessages(session.id, 100)).map(serializeMessage) : []; }
  async createMessage(roomId: number, user: User, content: string) {
    const session = await this.requireActiveSession(roomId);
    const value = content?.trim(); if (!value) throw new HttpError(400, 'Message content is required', 400);
    return serializeMessage(await this.store.addMessage({ sessionId: session.id, senderId: user.id, kind: 'CHAT', content: value.slice(0, 200) }));
  }

  async publish(roomId: number, user: User, offer: SrsExchange) { const room = await this.requireOwnedRoom(roomId, user.id); if (room.status !== 'LIVING') throw new HttpError(409, 'Start the room before publishing', 409); return this.srs.exchange('publish', room.streamKey, offer); }
  async play(roomId: number, offer: SrsExchange) { const room = await this.requireRoom(roomId); if (room.status !== 'LIVING') throw new HttpError(409, 'Live room is not active', 409); return this.srs.exchange('play', room.streamKey, offer); }

  async registerReplay(roomId: number, user: User, input: { objectKey: string; mimeType?: string; requestId?: string }) {
    const room = await this.requireOwnedRoom(roomId, user.id);
    const session = await this.latestSession(room.id);
    if (!session || session.status !== 'ENDED') throw new HttpError(409, 'Replay can be registered after the session ends', 409);
    const objectKey = input.objectKey?.trim(); if (!objectKey) throw new HttpError(400, 'objectKey is required', 400);
    const mimeType = normalizeReplayMime(objectKey, input.mimeType);
    const requestId = input.requestId?.trim() || randomUUID();
    const replay = await this.store.createReplay({ sessionId: session.id, objectKey, contentVideoId: null, status: 'PENDING', requestId, mimeType });
    return this.attemptReplay(replay);
  }

  async retryReplay(id: number) {
    const replay = await this.store.getReplay(id); if (!replay) throw new HttpError(404, 'Replay registration not found', 404);
    if (replay.status === 'FAILED_FINAL') throw new HttpError(409, 'Replay registration reached the retry limit', 409);
    return this.attemptReplay(replay);
  }

  async wallet(userId: number) { const transactions = await this.store.listTransactions(userId); const claims = transactions.filter((item) => item.type === 'DAILY_CLAIM'); const spent = transactions.filter((item) => item.amount < 0); return { balance: await this.store.getBalance(userId), totalClaimed: claims.reduce((sum, item) => sum + item.amount, 0), totalSpent: spent.reduce((sum, item) => sum + Math.abs(item.amount), 0), claimedToday: (await this.store.getDailyClaims(userId)).some((date) => sameDay(date, this.now())), todayClaimAmount: 2 }; }
  async claimDaily(userId: number, requestId: string) { return this.store.claimDaily(userId, startOfDay(this.now()), requestId); }
  async streak(userId: number) { const claims = await this.store.getDailyClaims(userId).then((items) => items.sort((a, b) => b.getTime() - a.getTime())); const streak = calculateStreak(claims, this.now()); const claimed = new Set(await this.store.getClaimedMilestones(userId)); return { streak, claimedToday: claims.some((date) => sameDay(date, this.now())), milestones: [3, 7, 14, 30].map((day) => ({ day, reached: streak >= day, claimed: claimed.has(day) })) }; }
  async claimMilestone(userId: number, milestone: number, requestId: string) { if (![3, 7, 14, 30].includes(milestone)) throw new HttpError(400, '无效的里程碑', 400); const info = await this.streak(userId); if (info.streak < milestone) return { claimed: false, amount: 0, balance: await this.store.getBalance(userId), message: '未达到该里程碑' }; return this.store.claimMilestone(userId, milestone, requestId); }
  async coinVideo(userId: number, videoId: number, amount: number, requestId: string) { if (!Number.isInteger(amount) || amount < 1 || amount > 2) throw new HttpError(400, '投币数量必须是 1 到 2 的整数', 400); try { return await this.store.coinVideo(userId, videoId, amount, requestId); } catch (error) { throw ledgerError(error); } }
  async gift(userId: number, amount: number, requestId: string) { if (!Number.isInteger(amount) || amount < 1 || amount > 100) throw new HttpError(400, '礼物数量必须是 1 到 100 的整数', 400); try { return await this.store.gift(userId, amount, requestId); } catch (error) { throw ledgerError(error); } }

  private async attemptReplay(replay: ReplayRecord) {
    if (replay.status === 'COMPLETED') return serializeReplay(replay);
    const registering = await this.store.updateReplay(replay.id, { status: 'REGISTERING', attempts: replay.attempts + 1, lastError: null, nextRetryAt: null });
    try {
      const result = await this.replayClient.register({ sessionId: registering.sessionId, objectKey: registering.objectKey, mimeType: registering.mimeType, requestId: registering.requestId });
      const completed = await this.store.updateReplay(registering.id, { status: 'COMPLETED', contentVideoId: result.contentVideoId, lastError: null });
      await this.store.updateSession(registering.sessionId, { replayStatus: 'COMPLETED' });
      return serializeReplay(completed);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'content-media replay registration failed';
      const failed = await this.store.updateReplay(registering.id, { status: registering.attempts >= 5 ? 'FAILED_FINAL' : 'FAILED_RETRYABLE', lastError: message, nextRetryAt: new Date(this.now().getTime() + Math.min(3600000, 1000 * 2 ** registering.attempts)) });
      await this.store.updateSession(registering.sessionId, { replayStatus: failed.status });
      return serializeReplay(failed);
    }
  }
  private async latestSession(roomId: number): Promise<SessionRecord | null> { return this.store.getLatestSession(roomId); }
  private async requireRoom(id: number) { const room = await this.store.getRoom(id); if (!room) throw new HttpError(404, 'Live room not found', 404); return room; }
  private async requireOwnedRoom(id: number, userId: number) { const room = await this.requireRoom(id); if (room.broadcasterId !== userId) throw new HttpError(403, 'Only broadcaster can operate this room', 403); return room; }
  private async requireActiveSession(roomId: number) { const session = await this.latestSession(roomId); if (!session || session.status !== 'LIVING') throw new HttpError(409, 'Live room is not active', 409); return session; }
  private async activeViewerCount(roomId: number) { const session = await this.latestSession(roomId); return session ? this.activeViewerCountBySession(session.id) : 0; }
  private async activeViewerCountBySession(sessionId: number) { const inMemory = this.viewerIds.get(sessionId); if (inMemory && !this.store.persistent) return inMemory.size; return this.store.countViewers(sessionId); }
  private isSrsConfigured() { return Boolean(process.env.SRS_API_BASE?.trim()); }
}

function buildSrsClient(): SrsClient { const api = process.env.SRS_API_BASE?.trim(); return api ? new FetchSrsClient(api.replace(/\/$/, ''), baseUrl('SRS_WEBRTC_BASE', 'webrtc://127.0.0.1/live')) : new DisabledSrsClient(); }
function buildReplayClient(): ReplayClient { const base = process.env.CONTENT_SERVICE_URL?.trim(); return base ? new ContentReplayClient(base.replace(/\/$/, '')) : { register: async () => { throw new HttpError(503, 'content-media is unavailable', 503); } }; }
function baseUrl(name: string, fallback: string) { return (process.env[name]?.trim() || fallback).replace(/\/$/, ''); }
function clampLimit(value?: number) { return Number.isInteger(value) && value! > 0 ? Math.min(value!, 50) : 20; }
function statusOrder(status: RoomStatus) { return status === 'LIVING' ? 0 : status === 'IDLE' ? 1 : 2; }
function serializeRoom(room: RoomRecord, viewerCount: number, session: SessionRecord | null) { return { id: room.id, title: room.title, category: room.category, coverUrl: room.coverUrl, sourceMode: room.sourceMode, streamKey: room.streamKey, rtmpUrl: room.rtmpUrl, playUrl: room.playUrl, status: room.status, viewerCount, createdAt: room.createdAt.toISOString(), startedAt: session?.status === 'LIVING' ? session.startedAt.toISOString() : null, endedAt: session?.endedAt?.toISOString() ?? null, sessionId: session?.id ?? null, replayStatus: session?.replayStatus ?? 'NONE', broadcaster: { id: room.broadcasterId } }; }
function serializeMessage(message: MessageRecord) { return { id: message.id, sessionId: message.sessionId, kind: message.kind, content: message.content, senderId: message.senderId, createdAt: message.createdAt.toISOString() }; }
function serializeReplay(replay: ReplayRecord) { return { ...replay, createdAt: replay.createdAt.toISOString(), updatedAt: replay.updatedAt.toISOString(), nextRetryAt: replay.nextRetryAt?.toISOString() ?? null }; }
function normalizeReplayMime(objectKey: string, value?: string) {
  const mimeType = value?.split(';', 1)[0]?.trim().toLowerCase();
  const extension = objectKey.toLowerCase().split(/[?#]/, 1)[0]!.match(/\.([a-z0-9]+)$/)?.[1];
  const extensionMime = extension === 'webm' ? 'video/webm' : extension === 'mp4' ? 'video/mp4' : null;
  if (!extensionMime) throw new HttpError(400, 'Replay asset filename must end with .webm or .mp4', 400);
  if (mimeType && mimeType !== extensionMime) throw new HttpError(400, 'Replay filename extension and MIME type must match', 400);
  return extensionMime;
}
function startOfDay(date: Date) { const result = new Date(date); result.setHours(0, 0, 0, 0); return result; }
function sameDay(left: Date, right: Date) { return startOfDay(left).getTime() === startOfDay(right).getTime(); }
function calculateStreak(claims: Date[], now: Date) { if (!claims.length) return 0; const today = startOfDay(now).getTime(); const latest = startOfDay(claims[0]!).getTime(); if (today - latest > 86400000) return 0; let result = 1; for (let i = 1; i < claims.length; i += 1) { if (startOfDay(claims[i - 1]!).getTime() - startOfDay(claims[i]!).getTime() !== 86400000) break; result += 1; } return result; }

export function createLiveHttpServer(app = new LiveApplication()): Server {
  const startedAt = Date.now();
  const server = createServer(async (request, response) => {
    const requestId = getRequestId(request);
    try {
      const url = new URL(request.url ?? '/', 'http://127.0.0.1');
      if (await handleHealth(request, response, url.pathname, requestId, startedAt, app)) return;
      const body = ['GET', 'HEAD'].includes(request.method ?? 'GET') ? {} : await readBody(request);
      const data = await dispatch(app, request, url, body, requestId);
      writeJson(response, 200, ok(data, requestId), requestId);
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500;
      const message = error instanceof Error ? error.message : 'internal server error';
      writeJson(response, status, failure(message, requestId, error instanceof HttpError ? error.code : 500), requestId);
    }
  });
  server.on('close', () => { void app.close(); });
  writeServiceLog('live-reward', 'http_server_created', { persistent: app.store.persistent });
  return server;
}

async function dispatch(app: LiveApplication, request: IncomingMessage, url: URL, body: Record<string, unknown>, requestId: string): Promise<unknown> {
  const method = request.method ?? 'GET'; const path = url.pathname; const user = userFromHeaders(request);
  if (method === 'POST' && path === '/api/v1/lives/rooms') return app.createRoom(requireUser(user), asRoomBody(body));
  if (method === 'GET' && path === '/api/v1/lives/rooms') return app.listRooms({ status: url.searchParams.get('status') ?? undefined, category: url.searchParams.get('category') ?? undefined, keyword: url.searchParams.get('keyword') ?? undefined, broadcasterId: parseOptionalInt(url.searchParams.get('broadcasterId')), limit: parseOptionalInt(url.searchParams.get('limit')) });
  const roomMatch = path.match(/^\/api\/v1\/lives\/rooms\/(\d+)(?:\/(.*))?$/); if (roomMatch) { const id = Number(roomMatch[1]); const suffix = roomMatch[2] ?? ''; if (method === 'GET' && !suffix) return app.getRoom(id); if (method === 'POST' && suffix === 'start') return app.startRoom(id, requireUser(user)); if (method === 'POST' && suffix === 'stop') return app.stopRoom(id, requireUser(user)); if (method === 'POST' && suffix === 'viewers') return app.addViewer(id, typeof body.viewerId === 'string' ? body.viewerId : undefined); if (method === 'POST' && suffix === 'messages') return app.createMessage(id, requireUser(user), stringValue(body.content)); if (method === 'GET' && suffix === 'messages') return app.listMessages(id); if (method === 'GET' && suffix === 'events') return { session: await app.getRoom(id), messages: await app.listMessages(id) }; if (method === 'POST' && suffix === 'publish') return app.publish(id, requireUser(user), asSrsBody(body)); if (method === 'POST' && suffix === 'play') return app.play(id, asSrsBody(body)); if (method === 'POST' && suffix === 'replay') return app.registerReplay(id, requireUser(user), { objectKey: stringValue(body.objectKey), mimeType: optionalString(body.mimeType), requestId }); }
  const viewerMatch = path.match(/^\/api\/v1\/lives\/rooms\/(\d+)\/viewers\/([^/]+)$/); if (viewerMatch && method === 'DELETE') return app.removeViewer(Number(viewerMatch[1]), decodeURIComponent(viewerMatch[2]!));
  const sessionMatch = path.match(/^\/api\/v1\/lives\/sessions\/(\d+)$/); if (sessionMatch && method === 'GET') return app.getSession(Number(sessionMatch[1]));
  if (method === 'GET' && path === '/api/v1/gift-coins/wallet') return app.wallet(requireUser(user).id);
  if (method === 'POST' && path === '/api/v1/gift-coins/daily-claim') return app.claimDaily(requireUser(user).id, requestId);
  if (method === 'GET' && path === '/api/v1/gift-coins/streak') return app.streak(requireUser(user).id);
  if (method === 'POST' && path === '/api/v1/gift-coins/streak-claim') return app.claimMilestone(requireUser(user).id, numberValue(body.milestone), requestId);
  if (method === 'POST' && path === '/api/v1/gift-coins/gift') return app.gift(requireUser(user).id, numberValue(body.amount), requestId);
  if (method === 'POST' && path === '/api/v1/gift-coins/video') return app.coinVideo(requireUser(user).id, numberValue(body.videoId), numberValue(body.amount), requestId);
  const giftVideoMatch = path.match(/^\/api\/v1\/gift-coins\/video\/(\d+)$/); if (giftVideoMatch && method === 'POST') return app.coinVideo(requireUser(user).id, Number(giftVideoMatch[1]), numberValue(body.amount), requestId);
  const coinMatch = path.match(/^\/api\/v1\/videos\/(\d+)\/coin$/); if (coinMatch && method === 'POST') return app.coinVideo(requireUser(user).id, Number(coinMatch[1]), numberValue(body.amount), requestId);
  const internalCoinMatch = path.match(/^\/internal\/v1\/(?:videos\/(\d+)\/coin|coins\/videos\/(\d+))$/); if (internalCoinMatch && method === 'POST') { authorizeInternal(request, 'live.ledger.write'); return app.coinVideo(integerValue(body.userId), Number(internalCoinMatch[1] ?? internalCoinMatch[2]), numberValue(body.amount), requestId); }
  const retryMatch = path.match(/^\/internal\/v1\/live\/replays\/(\d+)\/retry$/); if (retryMatch && method === 'POST') { authorizeInternal(request, 'live.replays.retry'); return app.retryReplay(Number(retryMatch[1])); }
  const statusMatch = path.match(/^\/internal\/v1\/live\/sessions\/(\d+)\/status$/); if (statusMatch && method === 'GET') { authorizeInternal(request, 'live.sessions.read'); return app.getSession(Number(statusMatch[1])); }
  throw new HttpError(404, 'route not found', 404);
}

async function handleHealth(request: IncomingMessage, response: ServerResponse, path: string, requestId: string, startedAt: number, app: LiveApplication) { if (request.method !== 'GET' || !['/health/live', '/health/ready', '/version'].includes(path)) return false; const version = process.env.GIT_SHA?.trim() || process.env.SERVICE_VERSION?.trim() || 'dev'; if (path === '/health/ready') { const ready = await app.ready(); writeJson(response, ready ? 200 : 503, ready ? ok({ service: 'live-reward', status: 'ready', version, persistent: app.store.persistent, uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000) }, requestId) : failure('service not ready', requestId, 503), requestId); return true; } if (path === '/version') writeJson(response, 200, ok({ service: 'live-reward', version, node: process.version }, requestId), requestId); else writeJson(response, 200, ok({ service: 'live-reward', status: 'live', version, uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000) }, requestId), requestId); return true; }
function userFromHeaders(request: IncomingMessage): User | null { const headerId = Number(request.headers['x-user-id']); const authorization = typeof request.headers.authorization === 'string' ? request.headers.authorization : ''; const tokenMatch = /^Bearer\s+mock-token-(\d+)-[^\s]+$/i.exec(authorization); const id = Number.isInteger(headerId) && headerId > 0 ? headerId : tokenMatch ? Number(tokenMatch[1]) : 0; if (!Number.isInteger(id) || id < 1) return null; const nickname = typeof request.headers['x-user-nickname'] === 'string' ? request.headers['x-user-nickname'] : `user-${id}`; return { id, nickname }; }
function requireUser(user: User | null) { if (!user) throw new HttpError(401, 'Authentication required', 401); return user; }
function authorizeInternal(request: IncomingMessage, scope: string) { const secret = process.env.SERVICE_JWT_SECRET; if (!secret) throw new HttpError(503, 'Internal service authentication is not configured', 503); try { return verifyServiceToken(parseBearer(request.headers.authorization), { audience: 'live-reward', secret, requiredScopes: [scope] }); } catch (error) { throw new HttpError(401, error instanceof Error ? error.message : 'Invalid service token', 401); } }
function parseBearer(header: string | string[] | undefined) { if (typeof header !== 'string' || !/^Bearer\s+\S+$/i.test(header)) throw new Error('Service Authorization header is required'); return header.replace(/^Bearer\s+/i, ''); }
function getRequestId(request: IncomingMessage) { const value = request.headers['x-request-id']; return typeof value === 'string' && value.trim() ? value.trim().slice(0, 128) : randomUUID(); }
async function readBody(request: IncomingMessage): Promise<Record<string, unknown>> { let text = ''; for await (const chunk of request) text += Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk); if (!text.trim()) return {}; try { const value = JSON.parse(text) as unknown; if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('JSON body must be an object'); return value as Record<string, unknown>; } catch { throw new HttpError(400, 'Invalid JSON body', 400); } }
function writeJson(response: ServerResponse, status: number, payload: unknown, requestId: string) { const body = JSON.stringify(payload); response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': Buffer.byteLength(body), 'x-request-id': requestId, 'x-service-version': process.env.GIT_SHA?.trim() || process.env.SERVICE_VERSION?.trim() || 'dev' }); response.end(body); }
function asRoomBody(body: Record<string, unknown>) { return { title: stringValue(body.title), category: optionalString(body.category), coverUrl: optionalString(body.coverUrl), sourceMode: body.sourceMode === 'screen' ? 'screen' as const : 'camera' as const }; }
function asSrsBody(body: Record<string, unknown>): SrsExchange { if (body.type !== 'offer' && body.type !== 'answer') throw new HttpError(400, 'type must be offer or answer', 400); return { type: body.type, sdp: stringValue(body.sdp) }; }
function stringValue(value: unknown) { if (typeof value !== 'string') throw new HttpError(400, 'String field is required', 400); return value; }
function optionalString(value: unknown) { return typeof value === 'string' ? value : undefined; }
function numberValue(value: unknown) { const number = typeof value === 'number' ? value : Number(value); if (!Number.isFinite(number)) throw new HttpError(400, 'Number field is required', 400); return number; }
function integerValue(value: unknown) { const number = numberValue(value); if (!Number.isInteger(number) || number < 1) throw new HttpError(400, 'Integer field is required', 400); return number; }
function parseOptionalInt(value: string | null) { if (value === null) return undefined; const number = Number(value); return Number.isInteger(number) ? number : undefined; }
function ledgerError(error: unknown) { const message = error instanceof Error ? error.message : 'ledger operation failed'; return new HttpError(400, message, 400); }
