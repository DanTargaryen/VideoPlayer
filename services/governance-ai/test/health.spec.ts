import { once } from 'node:events';

import { afterEach, describe, expect, it } from 'vitest';

import { createGovernanceService } from '../src/service.js';

const servers: ReturnType<typeof createGovernanceService>[] = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve()))));
});

describe('governance-ai scaffold', () => {
  it('exposes the service health and version contract without business routes', async () => {
    const server = createGovernanceService();
    servers.push(server);
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Expected TCP address');
    const baseUrl = `http://127.0.0.1:${address.port}`;
    expect((await (await fetch(`${baseUrl}/health/live`)).json()).data.service).toBe('governance-ai');
    expect((await fetch(`${baseUrl}/health/ready`)).status).toBe(200);
    expect((await fetch(`${baseUrl}/version`)).status).toBe(200);
    expect((await fetch(`${baseUrl}/api/v1/reports`)).status).toBe(404);
  });
});
