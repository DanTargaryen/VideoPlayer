import { once } from 'node:events';
import { createServer, type Server } from 'node:http';

import { issueServiceToken, verifyServiceToken } from '@videoplayer/shared-contracts';
import { afterEach, describe, expect, it } from 'vitest';

import { createContentService, createFixtureState } from '../../content-media/src/service.js';
import { ContentReplayClient, FetchSrsClient, HttpError, LiveApplication, createLiveHttpServer, type ReplayClient, type SrsClient } from '../src/live-app.js';
import { MemoryStore } from '../src/store.js';

const broadcaster = { id: 7, nickname: '主播' };
const servers: Server[] = [];
const serviceSecret = 'live-reward-test-secret-0123456789012345';

function trustedUserHeaders(id = 7, nickname = 'anchor', requestId = `trusted-${id}`) {
  process.env.SERVICE_JWT_SECRET = serviceSecret;
  const token = issueServiceToken({
    caller: 'gateway',
    audience: 'live-reward',
    scopes: ['live.user.forward'],
    secret: serviceSecret,
    requestId,
  });
  return {
    'x-user-id': String(id),
    'x-user-nickname': nickname,
    'x-request-id': requestId,
    'x-gateway-authorization': `Bearer ${token}`,
    'content-type': 'application/json',
  };
}

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve()))));
  delete process.env.SERVICE_JWT_SECRET;
});

async function listen(handler: Parameters<typeof createServer>[0]): Promise<string> {
  const server = createServer(handler);
  servers.push(server);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Expected TCP address');
  return `http://127.0.0.1:${address.port}`;
}

class HealthySrs implements SrsClient {
  async probe() {}
  async exchange(action: 'publish' | 'play', streamKey: string) { return { type: 'answer' as const, sdp: `${action}:${streamKey}`, sessionId: 'srs-1', server: 'srs' }; }
}

class ReplayStub implements ReplayClient {
  calls = 0;
  lastInput: Parameters<ReplayClient['register']>[0] | null = null;
  async register(input: Parameters<ReplayClient['register']>[0]) { this.calls += 1; this.lastInput = input; return { contentVideoId: 'content-video-42' }; }
}

describe('live-reward domain', () => {
  it('rejects client-supplied identity headers and accepts a signed gateway identity context', async () => {
    const server = createLiveHttpServer(new LiveApplication({ store: new MemoryStore() }));
    server.listen(0, '127.0.0.1');
    await new Promise<void>((resolve) => server.once('listening', () => resolve()));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Expected TCP address');
    try {
      const forged = await fetch(`http://127.0.0.1:${address.port}/api/v1/lives/rooms`, { method: 'POST', headers: { 'x-user-id': '999', 'content-type': 'application/json' }, body: JSON.stringify({ title: 'forged session' }) });
      expect(forged.status).toBe(401);
      const response = await fetch(`http://127.0.0.1:${address.port}/api/v1/lives/rooms`, { method: 'POST', headers: trustedUserHeaders(7, encodeURIComponent('中文主播')), body: JSON.stringify({ title: 'trusted session' }) });
      expect(response.status).toBe(200);
      expect((await response.json()).data.broadcaster.id).toBe(7);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('persists room/session lifecycle, viewer events, messages and replay registration', async () => {
    const replay = new ReplayStub();
    const app = new LiveApplication({ store: new MemoryStore(), srs: new HealthySrs(), replayClient: replay });
    const room = await app.createRoom(broadcaster, { title: '演示直播', category: 'tech' });
    expect(room.status).toBe('IDLE');
    const started = await app.startRoom(room.id, broadcaster);
    expect(started.status).toBe('LIVING');
    await app.addViewer(room.id, 'viewer-1');
    await app.createMessage(room.id, broadcaster, 'hello');
    expect((await app.listMessages(room.id)).some((item) => item.content === 'hello')).toBe(true);
    await app.stopRoom(room.id, broadcaster);
    await expect(app.registerReplay(room.id, broadcaster, { objectKey: 'recordings/mismatch.mp4', mimeType: 'video/webm', requestId: 'replay-mismatch' })).rejects.toMatchObject({ status: 400 });
    const replayResult = await app.registerReplay(room.id, broadcaster, { objectKey: 'recordings/1.webm', mimeType: 'video/webm', requestId: 'replay-1' });
    expect(replayResult.status).toBe('COMPLETED');
    expect(replayResult.contentVideoId).toBe('content-video-42');
    expect(replay.calls).toBe(1);
    expect(replay.lastInput).toMatchObject({ sessionId: started.sessionId, objectKey: 'recordings/1.webm', mimeType: 'video/webm', requestId: 'replay-1', creatorId: '7', title: '演示直播' });
    const session = await app.getSession(started.sessionId);
    expect(session.status).toBe('ENDED');
    expect(session.replay?.status).toBe('COMPLETED');
    const duplicate = await app.registerReplay(room.id, broadcaster, { objectKey: 'recordings/1.webm', mimeType: 'video/webm', requestId: 'replay-1' });
    expect(duplicate.id).toBe(replayResult.id);
    await expect(app.registerReplay(room.id, broadcaster, { objectKey: 'recordings/other.webm', mimeType: 'video/webm', requestId: 'replay-other' })).rejects.toMatchObject({ status: 409 });
  });

  it('keeps the room idle when SRS probe fails', async () => {
    const app = new LiveApplication({ store: new MemoryStore(), srs: { probe: async () => { throw new HttpError(503, 'SRS service is unavailable'); }, exchange: async () => { throw new Error('unreachable'); } } });
    const room = await app.createRoom(broadcaster, { title: '故障测试' });
    await expect(app.startRoom(room.id, broadcaster)).rejects.toMatchObject({ status: 503 });
    expect((await app.getRoom(room.id)).status).toBe('IDLE');
  });

  it('can start again after SRS recovers and keeps health available during an outage', async () => {
    let available = false;
    const app = new LiveApplication({ store: new MemoryStore(), srs: { probe: async () => { if (!available) throw new HttpError(503, 'SRS service is unavailable'); }, exchange: async () => ({ type: 'answer', sdp: 'answer', sessionId: null, server: null }) } });
    const room = await app.createRoom(broadcaster, { title: '恢复测试' });
    const server = createLiveHttpServer(app);
    servers.push(server);
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Expected TCP address');
    expect((await fetch(`http://127.0.0.1:${address.port}/health/live`)).status).toBe(200);
    await expect(app.startRoom(room.id, broadcaster)).rejects.toMatchObject({ status: 503 });
    available = true;
    expect((await app.startRoom(room.id, broadcaster)).status).toBe('LIVING');
  });

  it('retains replay failure state, retries after content recovery and stops at the final retry limit', async () => {
    let available = false;
    let calls = 0;
    const replay: ReplayClient = { register: async () => { calls += 1; if (!available) throw new HttpError(503, 'content-media is unavailable'); return { contentVideoId: 'content-video-84' }; } };
    const app = new LiveApplication({ store: new MemoryStore(), replayClient: replay });
    const room = await app.createRoom(broadcaster, { title: '回放重试' });
    await app.startRoom(room.id, broadcaster);
    await app.stopRoom(room.id, broadcaster);
    const failed = await app.registerReplay(room.id, broadcaster, { objectKey: 'recordings/retry.webm', requestId: 'replay-retry' });
    expect(failed.status).toBe('FAILED_RETRYABLE');
    expect(failed.attempts).toBe(1);
    expect(failed.lastError).toContain('content-media');
    expect(failed.nextRetryAt).toBeTruthy();
    expect((await app.getSession(failed.sessionId)).status).toBe('ENDED');
    available = true;
    const completed = await app.retryReplay(failed.id);
    expect(completed.status).toBe('COMPLETED');
    expect(completed.contentVideoId).toBe('content-video-84');
    expect(calls).toBe(2);
    expect((await app.retryReplay(failed.id)).status).toBe('COMPLETED');

    available = false;
    const finalRoom = await app.createRoom(broadcaster, { title: '最终失败' });
    await app.startRoom(finalRoom.id, broadcaster);
    await app.stopRoom(finalRoom.id, broadcaster);
    let final = await app.registerReplay(finalRoom.id, broadcaster, { objectKey: 'recordings/final.mp4', mimeType: 'video/mp4', requestId: 'replay-final' });
    for (let attempt = 1; attempt < 5; attempt += 1) final = await app.retryReplay(final.id);
    expect(final.status).toBe('FAILED_FINAL');
    expect(final.attempts).toBe(5);
    await expect(app.retryReplay(final.id)).rejects.toMatchObject({ status: 409 });
  });

  it('does not retry permanent content replay conflicts or authorization failures', async () => {
    for (const status of [400, 401, 409]) {
      const replay: ReplayClient = { register: async () => { throw new HttpError(status, `content-media returned ${status}`, status); } };
      const app = new LiveApplication({ store: new MemoryStore(), replayClient: replay });
      const room = await app.createRoom(broadcaster, { title: `永久失败-${status}` });
      await app.startRoom(room.id, broadcaster);
      await app.stopRoom(room.id, broadcaster);
      const result = await app.registerReplay(room.id, broadcaster, { objectKey: `recordings/permanent-${status}.webm`, requestId: `replay-permanent-${status}` });
      expect(result.status).toBe('FAILED_FINAL');
      expect(result.attempts).toBe(1);
      expect(result.nextRetryAt).toBeNull();
      expect(result.lastError).toContain(String(status));
      await expect(app.retryReplay(result.id)).rejects.toMatchObject({ status: 409 });
    }
  });

  it('makes wallet writes idempotent and enforces the per-video limit', async () => {
    const app = new LiveApplication({ store: new MemoryStore() });
    const first = await app.claimDaily(7, 'daily-1');
    const duplicate = await app.claimDaily(7, 'daily-1');
    expect(first.claimed).toBe(true);
    expect(duplicate.claimed).toBe(false);
    const coin = await app.coinVideo(7, 99, 2, 'coin-1');
    expect(coin.balance).toBe(10);
    await expect(app.coinVideo(7, 99, 1, 'coin-2')).rejects.toThrow('最多投币 2');
    const wallet = await app.wallet(7);
    expect(wallet.balance).toBe(10);
  });

  it('rejects requestId reuse with a different ledger payload', async () => {
    const store = new MemoryStore();
    const app = new LiveApplication({ store });
    await app.coinVideo(7, 99, 1, 'ledger-conflict');
    await expect(app.coinVideo(8, 100, 2, 'ledger-conflict')).rejects.toMatchObject({ status: 409 });
    await app.gift(7, 1, 'gift-conflict');
    await expect(app.gift(7, 2, 'gift-conflict')).rejects.toMatchObject({ status: 409 });
    await app.claimDaily(7, 'daily-conflict');
    await expect(app.claimDaily(8, 'daily-conflict')).rejects.toMatchObject({ status: 409 });
    await store.claimMilestone(7, 3, 'milestone-conflict');
    await expect(store.claimMilestone(7, 7, 'milestone-conflict')).rejects.toBeInstanceOf(Error);
  });

  it('reconstructs viewer state from the store boundary and trims ordinary chat at 10,000 messages', async () => {
    const store = new MemoryStore();
    const app = new LiveApplication({ store });
    const room = await app.createRoom(broadcaster, { title: '重启边界' });
    await app.startRoom(room.id, broadcaster);
    await app.addViewer(room.id, 'viewer-restart');
    for (let index = 0; index < 10001; index += 1) await app.createMessage(room.id, broadcaster, `message-${index}`);
    const restarted = new LiveApplication({ store });
    expect((await restarted.getRoom(room.id)).viewerCount).toBe(1);
    const messages = await restarted.listMessages(room.id);
    expect(messages).toHaveLength(100);
    expect(messages.at(-1)?.content).toBe('message-10000');
    const storedMessages = await store.listMessages((await store.getLatestSession(room.id))!.id, 10001);
    expect(storedMessages.filter((message) => message.kind === 'CHAT')).toHaveLength(10000);
    expect(storedMessages.filter((message) => message.kind === 'SYSTEM')).toHaveLength(1);
  }, 15_000);
});

describe('live-reward HTTP adapters and internal auth', () => {
  it('exposes the complete room/session HTTP lifecycle contract', async () => {
    const app = new LiveApplication({ store: new MemoryStore(), srs: new HealthySrs(), replayClient: new ReplayStub() });
    const server = createLiveHttpServer(app);
    servers.push(server);
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Expected TCP address');
    const baseUrl = `http://127.0.0.1:${address.port}`;
    let httpRequestCounter = 0;
    const request = async (path: string, init: RequestInit = {}) => {
      const extraHeaders = (init.headers ?? {}) as Record<string, string>;
      const requestId = extraHeaders['x-request-id'] ?? `http-user-${++httpRequestCounter}`;
      return fetch(`${baseUrl}${path}`, { ...init, headers: { ...trustedUserHeaders(7, 'anchor', requestId), ...extraHeaders } });
    };
    const created = await request('/api/v1/lives/rooms', { method: 'POST', body: JSON.stringify({ title: 'HTTP 生命周期', category: 'tech' }) });
    expect(created.status).toBe(200);
    const roomId = (await created.json()).data.id as number;
    expect((await request('/api/v1/lives/rooms')).status).toBe(200);
    expect((await request(`/api/v1/lives/rooms/${roomId}`)).status).toBe(200);
    expect((await request(`/api/v1/lives/rooms/${roomId}/start`, { method: 'POST' })).status).toBe(200);
    const viewer = await request(`/api/v1/lives/rooms/${roomId}/viewers`, { method: 'POST', body: JSON.stringify({ viewerId: 'http-viewer' }) });
    expect(viewer.status).toBe(200);
    const sessionId = (await viewer.json()).data.sessionId as number;
    expect((await request(`/api/v1/lives/sessions/${sessionId}`)).status).toBe(200);
    expect((await request(`/api/v1/lives/rooms/${roomId}/messages`, { method: 'POST', body: JSON.stringify({ content: 'hello' }) })).status).toBe(200);
    expect((await request(`/api/v1/lives/rooms/${roomId}/messages`)).status).toBe(200);
    expect((await request(`/api/v1/lives/rooms/${roomId}/events`)).status).toBe(200);
    expect((await request(`/api/v1/lives/rooms/${roomId}/viewers/http-viewer`, { method: 'DELETE' })).status).toBe(200);
    expect((await request(`/api/v1/lives/rooms/${roomId}/stop`, { method: 'POST' })).status).toBe(200);
    const replay = await request(`/api/v1/lives/rooms/${roomId}/replay`, { method: 'POST', headers: { 'x-request-id': 'http-replay' }, body: JSON.stringify({ objectKey: 'recordings/http.webm', mimeType: 'video/webm' }) });
    expect(replay.status).toBe(200);
    expect((await request('/api/v1/gift-coins/wallet')).status).toBe(200);
    expect((await request('/api/v1/gift-coins/daily-claim', { method: 'POST' })).status).toBe(200);
    expect((await request('/api/v1/gift-coins/streak')).status).toBe(200);
    expect((await request('/api/v1/gift-coins/gift', { method: 'POST', body: JSON.stringify({ amount: 1 }) })).status).toBe(200);
  });

  it('uses the SRS API with bounded timeout and exchanges RTC SDP', async () => {
    let exchangeBody: Record<string, unknown> | null = null;
    const baseUrl = await listen(async (request, response) => {
      if (request.url === '/api/v1/streams/') {
        response.end(JSON.stringify({ streams: [] }));
        return;
      }
      let text = '';
      for await (const chunk of request) text += String(chunk);
      exchangeBody = JSON.parse(text) as Record<string, unknown>;
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify({ code: 0, sdp: 'srs-answer', sessionid: 'srs-session', server: 'srs-node' }));
    });
    const client = new FetchSrsClient(baseUrl, 'webrtc://127.0.0.1/live', 200);
    await expect(client.probe()).resolves.toBeUndefined();
    await expect(client.exchange('publish', 'room-1', { type: 'offer', sdp: 'browser-offer' })).resolves.toEqual({ type: 'answer', sdp: 'srs-answer', sessionId: 'srs-session', server: 'srs-node' });
    expect(exchangeBody).toMatchObject({ streamurl: 'webrtc://127.0.0.1/live/room-1', sdp: 'browser-offer' });
  });

  it('surfaces an SRS timeout as a bounded dependency failure', async () => {
    const baseUrl = await listen((_request, response) => {
      setTimeout(() => response.end(JSON.stringify({ streams: [] })), 100);
    });
    await expect(new FetchSrsClient(baseUrl, 'webrtc://127.0.0.1/live', 20).probe()).rejects.toMatchObject({ status: 504 });
  });

  it('registers replay through content-media with a scoped service JWT', async () => {
    process.env.SERVICE_JWT_SECRET = serviceSecret;
    let receivedBody: Record<string, unknown> | null = null;
    let receivedClaims: ReturnType<typeof verifyServiceToken> | null = null;
    const baseUrl = await listen(async (request, response) => {
      let text = '';
      for await (const chunk of request) text += String(chunk);
      receivedBody = JSON.parse(text) as Record<string, unknown>;
      const header = request.headers.authorization;
      receivedClaims = verifyServiceToken(String(header).replace(/^Bearer\s+/i, ''), { audience: 'content-media', secret: serviceSecret, requiredScopes: ['internal:replay'] });
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify({ data: { contentVideoId: 'content-video-99' } }));
    });
    const client = new ContentReplayClient(baseUrl, 200);
    await expect(client.register({ sessionId: 12, objectKey: 'recordings/12.mp4', mimeType: 'video/mp4', requestId: 'replay-http', creatorId: '7', title: '直播标题' })).resolves.toEqual({ contentVideoId: 'content-video-99' });
    expect(receivedBody).toMatchObject({ objectKey: 'recordings/12.mp4', mimeType: 'video/mp4', requestId: 'replay-http', creatorId: '7', title: '直播标题' });
    expect(receivedClaims).toMatchObject({ sub: 'live-reward', aud: 'content-media', scope: ['internal:replay'], requestId: 'replay-http' });
  });

  it('accepts a 201 replay response and preserves content-media permanent failure statuses', async () => {
    process.env.SERVICE_JWT_SECRET = serviceSecret;
    const input = { sessionId: 12, objectKey: 'recordings/12.webm', mimeType: 'video/webm', requestId: 'replay-status', creatorId: '7', title: '直播标题' } as const;
    const created = await listen((_request, response) => { response.statusCode = 201; response.setHeader('content-type', 'application/json'); response.end(JSON.stringify({ data: { contentVideoId: 'content-video-201' } })); });
    await expect(new ContentReplayClient(created, 200).register(input)).resolves.toEqual({ contentVideoId: 'content-video-201' });
    const conflict = await listen((_request, response) => { response.statusCode = 409; response.end('conflict'); });
    await expect(new ContentReplayClient(conflict, 200).register(input)).rejects.toMatchObject({ status: 409, code: 409 });
    const invalid = await listen((_request, response) => { response.statusCode = 400; response.end('invalid'); });
    await expect(new ContentReplayClient(invalid, 200).register(input)).rejects.toMatchObject({ status: 400, code: 400 });
    const unauthorized = await listen((_request, response) => { response.statusCode = 401; response.end('unauthorized'); });
    await expect(new ContentReplayClient(unauthorized, 200).register(input)).rejects.toMatchObject({ status: 401, code: 401 });
    const timedOut = await listen((_request, response) => { setTimeout(() => response.end('{}'), 100); });
    await expect(new ContentReplayClient(timedOut, 10).register(input)).rejects.toMatchObject({ status: 504, code: 504 });
  });

  it('round-trips the live-reward client against the content-media HTTP server', async () => {
    process.env.SERVICE_JWT_SECRET = serviceSecret;
    const state = createFixtureState();
    const contentServer = createContentService({ state, internalJwtSecret: serviceSecret });
    servers.push(contentServer);
    contentServer.listen(0, '127.0.0.1');
    await once(contentServer, 'listening');
    const address = contentServer.address();
    if (!address || typeof address === 'string') throw new Error('Expected TCP address');
    const client = new ContentReplayClient(`http://127.0.0.1:${address.port}`, 500);
    const input = { sessionId: 12, objectKey: 'recordings/integration.webm', mimeType: 'video/webm', requestId: 'replay-integration', creatorId: '7', title: '真实联调直播' } as const;
    const created = await client.register(input);
    expect(created.contentVideoId).toBe('1001');
    const duplicate = await client.register(input);
    expect(duplicate).toEqual(created);
    await expect(client.register({ ...input, title: '冲突载荷' })).rejects.toMatchObject({ status: 409 });
    expect(state.replays).toHaveLength(1);
    expect(state.replays[0]).toMatchObject({ requestId: input.requestId, objectKey: input.objectKey, mimeType: input.mimeType, creatorId: input.creatorId, title: input.title, contentVideoId: created.contentVideoId });
  });

  it('protects internal coin writes with service JWT scope', async () => {
    process.env.SERVICE_JWT_SECRET = serviceSecret;
    const server = createLiveHttpServer(new LiveApplication({ store: new MemoryStore() }));
    servers.push(server);
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Expected TCP address');
    const baseUrl = `http://127.0.0.1:${address.port}`;
    const token = issueServiceToken({ caller: 'gateway', audience: 'live-reward', scopes: ['live.ledger.write'], secret: serviceSecret, requestId: 'gateway-coin-1' });
    const response = await fetch(`${baseUrl}/internal/v1/videos/99/coin`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', 'x-request-id': 'gateway-coin-1' }, body: JSON.stringify({ userId: 7, amount: 1 }) });
    expect(response.status).toBe(200);
    expect((await response.json()).data).toMatchObject({ amount: 1, balance: 9 });
    const cuidRequestId = 'gateway-coin-cuid';
    const cuidToken = issueServiceToken({ caller: 'gateway', audience: 'live-reward', scopes: ['live.ledger.write'], secret: serviceSecret, requestId: cuidRequestId });
    const cuid = await fetch(`${baseUrl}/internal/v1/videos/video-cuid-1/coin`, { method: 'POST', headers: { authorization: `Bearer ${cuidToken}`, 'content-type': 'application/json', 'x-request-id': cuidRequestId }, body: JSON.stringify({ userId: 7, amount: 1 }) });
    expect(cuid.status).toBe(200);

    const walletRequestId = 'content-wallet-read';
    const walletToken = issueServiceToken({ caller: 'content-media', audience: 'live-reward', scopes: ['live.wallet.read'], secret: serviceSecret, requestId: walletRequestId });
    const wallet = await fetch(`${baseUrl}/internal/v1/users/7/wallet`, { headers: { authorization: `Bearer ${walletToken}`, 'x-request-id': walletRequestId } });
    expect(wallet.status).toBe(200);
    expect((await wallet.json()).data.balance).toBe(8);
    const denied = await fetch(`${baseUrl}/internal/v1/videos/99/coin`, { method: 'POST', headers: { authorization: `Bearer ${issueServiceToken({ caller: 'gateway', audience: 'live-reward', scopes: [], secret: serviceSecret })}`, 'content-type': 'application/json' }, body: JSON.stringify({ userId: 7, amount: 1 }) });
    expect(denied.status).toBe(401);
  });
});
