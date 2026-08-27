import { once } from 'node:events';

import { afterEach, describe, expect, it } from 'vitest';

import { createHealthServer } from '../src/http-runtime.js';

const servers: ReturnType<typeof createHealthServer>[] = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve()))));
});

async function start(ready = true) {
  const server = createHealthServer({ serviceName: 'identity-community', defaultPort: 3101, ready: () => ready });
  servers.push(server);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Expected TCP address');
  return `http://127.0.0.1:${address.port}`;
}

describe('health runtime', () => {
  it('serves live, ready and version contracts with request IDs', async () => {
    const baseUrl = await start();
    for (const path of ['/health/live', '/health/ready', '/version']) {
      const response = await fetch(`${baseUrl}${path}`, { headers: { 'x-request-id': 'trace-1' } });
      expect(response.status).toBe(200);
      expect(response.headers.get('x-request-id')).toBe('trace-1');
      expect((await response.json()).data.service).toBe('identity-community');
    }
  });

  it('returns 503 for an unready service and 404 for business routes', async () => {
    const baseUrl = await start(false);
    expect((await fetch(`${baseUrl}/health/ready`)).status).toBe(503);
    expect((await fetch(`${baseUrl}/api/v1/users/1`)).status).toBe(404);
  });
});
