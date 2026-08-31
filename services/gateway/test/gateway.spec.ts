import { once } from 'node:events';
import { createServer, type Server } from 'node:http';

import { verifyServiceToken } from '@videoplayer/shared-contracts';
import { afterEach, describe, expect, it } from 'vitest';

import { createGatewayServer, loadGatewayConfig, resolveUpstream, resolveUpstreamName, type GatewayConfig } from '../src/gateway.js';

const servers: Server[] = [];
const serviceSecret = 'gateway-live-user-forward-secret-0123456789';

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
    serviceJwtSecret: serviceSecret,
    readCutover: ['identity-community', 'content-media', 'live-reward', 'governance-ai'],
    writeCutover: ['identity-community', 'content-media', 'live-reward', 'governance-ai'],
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
    expect(resolveUpstream('/api/v1/auth/login', value, 'POST')).toBe('http://identity:3000');
    expect(resolveUpstream('/api/v1/feed/dynamic', value)).toBe('http://identity:3000');
    expect(resolveUpstream('/api/v1/videos/1', value)).toBe('http://content:3000');
    expect(resolveUpstream('/api/v1/videos/1/coin', value, 'POST')).toBe('http://live:3000');
    expect(resolveUpstreamName('/api/v1/videos/1/coin', value, 'POST')).toBe('live-reward');
    expect(resolveUpstream('/api/v1/lives/rooms', value)).toBe('http://live:3000');
    expect(resolveUpstream('/api/v1/reports', value, 'POST')).toBe('http://governance:3000');
    expect(resolveUpstreamName('/api/v1/reports', value, 'POST')).toBe('governance-ai');
    expect(resolveUpstream('/api/v1/feed/sidebar/live', value)).toBe(value.monolithBaseUrl);
    expect(resolveUpstream('/api/v1/search/suggest', value)).toBe(value.monolithBaseUrl);
    expect(resolveUpstream('/api/v1/videos/1/comments', value)).toBe('http://content:3000');
    expect(resolveUpstream('/api/v1/videos/1/like', value, 'POST')).toBe('http://content:3000');
    expect(resolveUpstream('/api/v1/videos/upload', value, 'POST')).toBe('http://content:3000');
    expect(resolveUpstream('/api/v1/videos', value, 'POST')).toBe('http://content:3000');
    expect(resolveUpstream('/api/v1/creator/dashboard', value)).toBe('http://content:3000');
    expect(resolveUpstream('/api/v1/media/objects/videos%2Foriginal%2Fsample.mp4', value)).toBe('http://content:3000');
    expect(resolveUpstream('/api/v1/auth/login', { ...value, routeMode: 'monolith' }, 'POST')).toBe(value.monolithBaseUrl);
  });

  it('defaults services mode to verified identity and content reads with all writes disabled', () => {
    const value = loadGatewayConfig({
      GATEWAY_ROUTE_MODE: 'services',
      MONOLITH_BASE_URL: 'http://monolith:3000',
      IDENTITY_SERVICE_URL: 'http://identity:3000',
      CONTENT_SERVICE_URL: 'http://content:3000',
      LIVE_SERVICE_URL: 'http://live:3000',
      GOVERNANCE_SERVICE_URL: 'http://governance:3000',
    });
    expect(value.readCutover).toEqual(['identity-community', 'content-media']);
    expect(value.writeCutover).toEqual([]);
    expect(resolveUpstreamName('/api/v1/users/7/homepage', value)).toBe('identity-community');
    expect(resolveUpstreamName('/api/v1/feeds/recommend', value)).toBe('content-media');
    expect(resolveUpstreamName('/api/v1/lives/rooms', value)).toBe('monolith');
    expect(resolveUpstreamName('/api/v1/auth/register', value, 'POST')).toBe('monolith');
    expect(resolveUpstreamName('/api/v1/videos/7/submit-review', value, 'POST')).toBe('monolith');
  });

  it('rejects unknown cutover services instead of silently routing them', () => {
    expect(() => loadGatewayConfig({ GATEWAY_ROUTE_MODE: 'services', GATEWAY_READ_CUTOVER: 'identity-community,unknown' }))
      .toThrow('Unsupported Gateway cutover service: unknown');
  });

  it('cuts over verified identity and content reads while preserving monolith writes and unsupported paths', async () => {
    const upstream = (owner: string) => createServer((request, response) => {
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify({ owner, method: request.method, path: request.url, requestId: request.headers['x-request-id'] }));
    });
    const monolith = await listen(upstream('monolith'));
    const identity = await listen(upstream('identity-community'));
    const content = await listen(upstream('content-media'));
    const gateway = await listen(createGatewayServer(config({
      routeMode: 'services',
      monolithBaseUrl: monolith,
      identityBaseUrl: identity,
      contentBaseUrl: content,
      readCutover: ['identity-community', 'content-media'],
      writeCutover: [],
    })));

    for (const [path, owner] of [
      ['/api/v1/feed/dynamic', 'identity-community'],
      ['/api/v1/users/7/homepage', 'identity-community'],
      ['/api/v1/feeds/recommend', 'content-media'],
      ['/api/v1/search/all?q=architecture', 'content-media'],
      ['/api/v1/videos/1/recommendations', 'content-media'],
      ['/api/v1/feed/sidebar/live', 'monolith'],
      ['/api/v1/search/suggest?q=arch', 'monolith'],
      ['/api/v1/videos/1/comments', 'content-media'],
      ['/api/v1/videos/1/danmaku', 'content-media'],
      ['/api/v1/videos/my/favorite-folders', 'content-media'],
    ] as const) {
      const response = await fetch(`${gateway}${path}`, { headers: { 'x-request-id': `read-${owner}` } });
      expect(response.headers.get('x-gateway-upstream')).toBe(owner);
      expect(await response.json()).toMatchObject({ owner, path });
    }

    for (const path of ['/api/v1/auth/register', '/api/v1/videos/1/submit-review', '/api/v1/reports']) {
      const response = await fetch(`${gateway}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
      expect(response.headers.get('x-gateway-upstream')).toBe('monolith');
      expect(await response.json()).toMatchObject({ owner: 'monolith', method: 'POST', path });
    }
  });

  it('forwards verified users to content interaction writes and supports explicit rollback', async () => {
    const identity = await listen(createServer((request, response) => {
      if (request.headers.authorization !== 'Bearer valid-content-user') {
        response.statusCode = 401;
        response.end('{}');
        return;
      }
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify({ data: { id: 9, nickname: '内容用户', role: 'USER' } }));
    }));
    const content = await listen(createServer((request, response) => {
      const gatewayToken = String(request.headers['x-gateway-authorization']).replace(/^Bearer\s+/i, '');
      const claims = verifyServiceToken(gatewayToken, {
        audience: 'content-media',
        secret: serviceSecret,
        requiredScopes: ['content.user.forward'],
        allowedCallers: ['gateway'],
      });
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify({
        owner: 'content-media',
        method: request.method,
        path: request.url,
        userId: request.headers['x-user-id'],
        nickname: request.headers['x-user-nickname'],
        requestId: claims.requestId,
      }));
    }));
    const monolith = await listen(createServer((request, response) => {
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify({ owner: 'monolith', method: request.method, path: request.url }));
    }));
    const gateway = await listen(createGatewayServer(config({
      routeMode: 'services',
      monolithBaseUrl: monolith,
      identityBaseUrl: identity,
      contentBaseUrl: content,
      readCutover: ['content-media'],
      writeCutover: ['content-media'],
    })));

    for (const path of [
      '/api/v1/videos/1/comments',
      '/api/v1/videos/1/like',
      '/api/v1/videos/1/favorite',
      '/api/v1/videos/1/watch-progress',
      '/api/v1/videos/1/danmaku',
      '/api/v1/videos/my/favorite-folders',
      '/api/v1/videos/upload',
      '/api/v1/videos',
      '/api/v1/videos/1/withdraw-review',
    ]) {
      const response = await fetch(`${gateway}${path}`, {
        method: 'POST',
        headers: { authorization: 'Bearer valid-content-user', 'content-type': 'application/json', 'x-request-id': `content-${path}`.slice(0, 128), 'x-user-id': '999' },
        body: '{}',
      });
      expect(response.status).toBe(200);
      expect(response.headers.get('x-gateway-upstream')).toBe('content-media');
      expect(await response.json()).toMatchObject({ owner: 'content-media', userId: '9', nickname: encodeURIComponent('内容用户') });
    }

    const rollbackGateway = await listen(createGatewayServer(config({
      routeMode: 'services',
      monolithBaseUrl: monolith,
      identityBaseUrl: identity,
      contentBaseUrl: content,
      readCutover: ['content-media'],
      writeCutover: [],
    })));
    const rollback = await fetch(`${rollbackGateway}/api/v1/videos/1/like`, { method: 'POST', headers: { authorization: 'Bearer valid-content-user' } });
    expect(rollback.headers.get('x-gateway-upstream')).toBe('monolith');
    expect(await rollback.json()).toMatchObject({ owner: 'monolith' });
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
    expect(await (await fetch(`${gateway}/api/v1/users/1/homepage`)).text()).toBe('monolith');
    expect((await fetch(`${gateway}/api/v1/users/1/follow`, { method: 'POST', body: '{}' })).status).toBe(503);
  });

  it('switches live writes to live-reward and rolls them back to the monolith', async () => {
    const identity = await listen(createServer((request, response) => {
      if (request.headers.authorization !== 'Bearer valid-user-token') {
        response.statusCode = 401;
        response.end('{}');
        return;
      }
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify({ data: { id: 7, nickname: 'verified-anchor', role: 'ADMIN' } }));
    }));
    const live = await listen(createServer((request, response) => {
      const gatewayToken = String(request.headers['x-gateway-authorization']).replace(/^Bearer\s+/i, '');
      const claims = verifyServiceToken(gatewayToken, {
        audience: 'live-reward',
        secret: serviceSecret,
        requiredScopes: ['live.user.forward'],
        allowedCallers: ['gateway'],
      });
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify({ owner: 'live-reward', method: request.method, path: request.url, userId: request.headers['x-user-id'], nickname: request.headers['x-user-nickname'], requestId: claims.requestId }));
    }));
    const monolith = await listen(createServer((request, response) => {
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify({ owner: 'monolith', method: request.method, path: request.url }));
    }));
    const serviceGateway = await listen(createGatewayServer(config({ routeMode: 'services', monolithBaseUrl: monolith, identityBaseUrl: identity, liveBaseUrl: live })));
    for (const path of ['/api/v1/lives/rooms', '/api/v1/gift-coins/daily-claim', '/api/v1/videos/9/coin']) {
      const response = await fetch(`${serviceGateway}${path}`, { method: 'POST', headers: { authorization: 'Bearer valid-user-token', 'content-type': 'application/json', 'x-user-id': '999', 'x-user-nickname': 'forged' }, body: '{}' });
      expect(response.status).toBe(200);
      expect(response.headers.get('x-gateway-upstream')).toBe('live-reward');
      const payload = await response.json();
      expect(payload.owner).toBe('live-reward');
      expect(payload.userId).toBe('7');
      expect(payload.nickname).toBe('verified-anchor');
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
    const identity = await listen(createServer((_request, response) => {
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify({ data: { id: 7, nickname: 'anchor' } }));
    }));
    const gateway = await listen(createGatewayServer(config({ routeMode: 'services', monolithBaseUrl: monolith, identityBaseUrl: identity, liveBaseUrl: failingLive })));
    for (const path of ['/api/v1/lives/rooms', '/api/v1/gift-coins/gift', '/api/v1/videos/9/coin']) {
      const response = await fetch(`${gateway}${path}`, { method: 'POST', headers: { authorization: 'Bearer valid-user-token', 'content-type': 'application/json' }, body: '{}' });
      expect(response.status).toBe(503);
      expect(response.headers.get('x-gateway-upstream')).toBe('live-reward');
    }
    expect(monolithWrites).toBe(0);
  });

  it('forwards a verified role to governance and strips forged identity headers', async () => {
    const identity = await listen(createServer((_request, response) => {
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify({ data: { id: 7, nickname: '中文管理员', role: 'ADMIN' } }));
    }));
    const governance = await listen(createServer((request, response) => {
      const gatewayToken = String(request.headers['x-gateway-authorization']).replace(/^Bearer\s+/i, '');
      const claims = verifyServiceToken(gatewayToken, { audience: 'governance-ai', secret: serviceSecret, requiredScopes: ['governance.user.forward'], allowedCallers: ['gateway'] });
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify({ userId: request.headers['x-user-id'], nickname: decodeURIComponent(String(request.headers['x-user-nickname'])), role: request.headers['x-user-role'], requestId: claims.requestId }));
    }));
    const gateway = await listen(createGatewayServer(config({ routeMode: 'services', identityBaseUrl: identity, governanceBaseUrl: governance })));
    const response = await fetch(`${gateway}/api/v1/admin/reports`, { headers: { authorization: 'Bearer valid', 'x-user-id': '999', 'x-user-role': 'USER', 'x-request-id': 'governance-forward-1' } });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ userId: '7', nickname: '中文管理员', role: 'ADMIN', requestId: 'governance-forward-1' });
  });

  it('forwards a verified creator only for the content submit-review write', async () => {
    const identity = await listen(createServer((_request, response) => {
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify({ data: { id: 1, nickname: '中文创作者', role: 'USER' } }));
    }));
    const content = await listen(createServer((request, response) => {
      const gatewayToken = String(request.headers['x-gateway-authorization']).replace(/^Bearer\s+/i, '');
      const claims = verifyServiceToken(gatewayToken, {
        audience: 'content-media',
        secret: serviceSecret,
        requiredScopes: ['content.user.forward'],
        allowedCallers: ['gateway'],
      });
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify({
        userId: request.headers['x-user-id'],
        nickname: decodeURIComponent(String(request.headers['x-user-nickname'])),
        role: request.headers['x-user-role'],
        requestId: claims.requestId,
      }));
    }));
    const gateway = await listen(createGatewayServer(config({ routeMode: 'services', identityBaseUrl: identity, contentBaseUrl: content })));
    const response = await fetch(`${gateway}/api/v1/videos/3/submit-review`, {
      method: 'POST',
      headers: {
        authorization: 'Bearer creator-token',
        'x-request-id': 'content-submit-1',
        'x-user-id': '999',
        'x-user-role': 'ADMIN',
      },
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ userId: '1', nickname: '中文创作者', role: 'USER', requestId: 'content-submit-1' });
  });

  it('does not trust client identity headers when identity authentication fails', async () => {
    let liveWrites = 0;
    const identity = await listen(createServer((_request, response) => {
      response.statusCode = 401;
      response.end('{}');
    }));
    const live = await listen(createServer((_request, response) => {
      liveWrites += 1;
      response.end('{}');
    }));
    const gateway = await listen(createGatewayServer(config({ routeMode: 'services', identityBaseUrl: identity, liveBaseUrl: live })));
    const response = await fetch(`${gateway}/api/v1/lives/rooms`, {
      method: 'POST',
      headers: { authorization: 'Bearer forged', 'x-user-id': '999', 'content-type': 'application/json' },
      body: '{}',
    });
    expect(response.status).toBe(401);
    expect(liveWrites).toBe(0);
  });
});
