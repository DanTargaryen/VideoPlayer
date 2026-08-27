import { once } from 'node:events';
import { createServer, type Server } from 'node:http';

import { afterEach, describe, expect, it } from 'vitest';

import { createGatewayServer, resolveUpstream, resolveUpstreamName, type GatewayConfig } from '../src/gateway.js';

const servers: Server[] = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve()))));
});

async function listen(server: Server): Promise<string> {
  servers.push(server);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Expected TCP address');
  return `http://127.0.0.1:${address.port}`;
}

function config(overrides: Partial<GatewayConfig> = {}): GatewayConfig {
  return {
    routeMode: 'monolith',
    monolithBaseUrl: 'http://127.0.0.1:1',
    fallbackEnabled: true,
    timeoutMs: 1000,
    ...overrides,
  };
}

describe('gateway scaffold', () => {
  it('maps frozen path groups to service upstreams only in services mode', () => {
    const value = config({
      routeMode: 'services',
      identityBaseUrl: 'http://identity:3000',
      contentBaseUrl: 'http://content:3000',
      liveBaseUrl: 'http://live:3000',
      governanceBaseUrl: 'http://governance:3000',
    });
    expect(resolveUpstream('/api/v1/auth/login', value)).toBe('http://identity:3000');
    expect(resolveUpstream('/api/v1/feed/dynamic', value)).toBe('http://identity:3000');
    expect(resolveUpstream('/api/v1/videos/1', value)).toBe('http://content:3000');
    expect(resolveUpstream('/api/v1/videos/1/coin', value)).toBe('http://live:3000');
    expect(resolveUpstreamName('/api/v1/videos/1/coin', value)).toBe('live-reward');
    expect(resolveUpstream('/api/v1/lives/rooms', value)).toBe('http://live:3000');
    expect(resolveUpstream('/api/v1/reports', value)).toBe('http://governance:3000');
    expect(resolveUpstreamName('/api/v1/reports', value)).toBe('governance-ai');
    expect(resolveUpstream('/api/v1/auth/login', { ...value, routeMode: 'monolith' })).toBe(value.monolithBaseUrl);
  });

  it('exposes gateway health and proxies to the monolith by default', async () => {
    const monolith = await listen(createServer((request, response) => {
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify({ path: request.url, requestId: request.headers['x-request-id'] }));
    }));
    const gateway = await listen(createGatewayServer(config({ monolithBaseUrl: monolith })));
    expect((await (await fetch(`${gateway}/health/live`)).json()).data.routeMode).toBe('monolith');
    const response = await fetch(`${gateway}/api/v1/auth/me`, { headers: { 'x-request-id': 'gateway-trace' } });
    expect(response.status).toBe(200);
    expect(response.headers.get('x-gateway-upstream')).toBe('monolith');
    expect(await response.json()).toEqual({ path: '/api/v1/auth/me', requestId: 'gateway-trace' });
  });

  it('falls back to the monolith for failed service reads but not failed writes', async () => {
    const failingService = await listen(createServer((_request, response) => {
      response.statusCode = 503;
      response.end('service unavailable');
    }));
    const monolith = await listen(createServer((_request, response) => response.end('monolith')));
    const gateway = await listen(createGatewayServer(config({
      routeMode: 'services',
      monolithBaseUrl: monolith,
      identityBaseUrl: failingService,
    })));
    expect(await (await fetch(`${gateway}/api/v1/users/1`)).text()).toBe('monolith');
    expect((await fetch(`${gateway}/api/v1/users/1`, { method: 'POST', body: '{}' })).status).toBe(503);
  });

  it('switches live writes to live-reward and rolls them back to the monolith', async () => {
    const live = await listen(createServer((request, response) => {
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify({ owner: 'live-reward', method: request.method, path: request.url }));
    }));
    const monolith = await listen(createServer((request, response) => {
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify({ owner: 'monolith', method: request.method, path: request.url }));
    }));
    const serviceGateway = await listen(createGatewayServer(config({ routeMode: 'services', monolithBaseUrl: monolith, liveBaseUrl: live })));
    for (const path of ['/api/v1/lives/rooms', '/api/v1/gift-coins/daily-claim', '/api/v1/videos/9/coin']) {
      const response = await fetch(`${serviceGateway}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
      expect(response.status).toBe(200);
      expect(response.headers.get('x-gateway-upstream')).toBe('live-reward');
      expect((await response.json()).owner).toBe('live-reward');
    }

    const rollbackGateway = await listen(createGatewayServer(config({ routeMode: 'monolith', monolithBaseUrl: monolith, liveBaseUrl: live })));
    const rollback = await fetch(`${rollbackGateway}/api/v1/lives/rooms`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    expect(rollback.status).toBe(200);
    expect(rollback.headers.get('x-gateway-upstream')).toBe('monolith');
    expect((await rollback.json()).owner).toBe('monolith');
  });

  it('never replays failed live writes to the monolith', async () => {
    let monolithWrites = 0;
    const failingLive = await listen(createServer((_request, response) => {
      response.statusCode = 503;
      response.end('live unavailable');
    }));
    const monolith = await listen(createServer((_request, response) => {
      monolithWrites += 1;
      response.end('monolith');
    }));
    const gateway = await listen(createGatewayServer(config({ routeMode: 'services', monolithBaseUrl: monolith, liveBaseUrl: failingLive })));
    for (const path of ['/api/v1/lives/rooms', '/api/v1/gift-coins/gift', '/api/v1/videos/9/coin']) {
      const response = await fetch(`${gateway}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
      expect(response.status).toBe(503);
      expect(response.headers.get('x-gateway-upstream')).toBe('live-reward');
    }
    expect(monolithWrites).toBe(0);
  });
});
