import { once } from 'node:events';

import { afterEach, describe, expect, it } from 'vitest';

import { createLiveService } from '../src/service.js';

const servers: ReturnType<typeof createLiveService>[] = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve()))));
});

describe('live-reward runtime', () => {
  it('exposes health/version and the public room listing contract', async () => {
    const server = createLiveService();
    servers.push(server);
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Expected TCP address');
    const baseUrl = `http://127.0.0.1:${address.port}`;
    expect((await (await fetch(`${baseUrl}/health/live`)).json()).data.service).toBe('live-reward');
    expect((await fetch(`${baseUrl}/health/ready`)).status).toBe(200);
    expect((await fetch(`${baseUrl}/version`)).status).toBe(200);
    const rooms = await fetch(`${baseUrl}/api/v1/lives/rooms`);
    expect(rooms.status).toBe(200);
    expect((await rooms.json()).data).toEqual([]);
  });
});
