import { describe, expect, it } from 'vitest';

import { HttpError, LiveApplication, createLiveHttpServer, type ReplayClient, type SrsClient } from '../src/live-app.js';
import { MemoryStore } from '../src/store.js';

const broadcaster = { id: 7, nickname: '主播' };

class HealthySrs implements SrsClient {
  async probe() {}
  async exchange(action: 'publish' | 'play', streamKey: string) { return { type: 'answer' as const, sdp: `${action}:${streamKey}`, sessionId: 'srs-1', server: 'srs' }; }
}

class ReplayStub implements ReplayClient {
  calls = 0;
  async register() { this.calls += 1; return { contentVideoId: 42 }; }
}

describe('live-reward domain', () => {
  it('accepts the gateway-compatible mock user token without querying identity', async () => {
    const server = createLiveHttpServer(new LiveApplication({ store: new MemoryStore() }));
    server.listen(0, '127.0.0.1');
    await new Promise<void>((resolve) => server.once('listening', () => resolve()));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Expected TCP address');
    try {
      const response = await fetch(`http://127.0.0.1:${address.port}/api/v1/lives/rooms`, { method: 'POST', headers: { authorization: 'Bearer mock-token-7-session', 'content-type': 'application/json' }, body: JSON.stringify({ title: 'token session' }) });
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
    const replayResult = await app.registerReplay(room.id, broadcaster, { objectKey: 'recordings/1.webm', mimeType: 'video/webm', requestId: 'replay-1' });
    expect(replayResult.status).toBe('COMPLETED');
    expect(replayResult.contentVideoId).toBe(42);
    expect(replay.calls).toBe(1);
    const session = await app.getSession(started.sessionId);
    expect(session.status).toBe('ENDED');
    expect(session.replay?.status).toBe('COMPLETED');
  });

  it('keeps the room idle when SRS probe fails', async () => {
    const app = new LiveApplication({ store: new MemoryStore(), srs: { probe: async () => { throw new HttpError(503, 'SRS service is unavailable'); }, exchange: async () => { throw new Error('unreachable'); } } });
    const room = await app.createRoom(broadcaster, { title: '故障测试' });
    await expect(app.startRoom(room.id, broadcaster)).rejects.toMatchObject({ status: 503 });
    expect((await app.getRoom(room.id)).status).toBe('IDLE');
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
});
