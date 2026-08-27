import { randomUUID } from 'node:crypto';
import { createServer, type IncomingHttpHeaders, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { Readable } from 'node:stream';

import { failure, ok } from '@videoplayer/shared-contracts';

export type GatewayRouteMode = 'monolith' | 'services';

export interface GatewayConfig {
  routeMode: GatewayRouteMode;
  monolithBaseUrl: string;
  identityBaseUrl?: string;
  contentBaseUrl?: string;
  liveBaseUrl?: string;
  governanceBaseUrl?: string;
  fallbackEnabled: boolean;
  timeoutMs: number;
}

const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
  'host',
]);

function normalizeBaseUrl(value: string | undefined, fallback?: string): string | undefined {
  const resolved = value?.trim() || fallback;
  if (!resolved) return undefined;
  const parsed = new URL(resolved);
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error(`Unsupported upstream protocol: ${parsed.protocol}`);
  return parsed.toString().replace(/\/$/, '');
}

function parseTimeout(value: string | undefined): number {
  const timeoutMs = Number(value ?? 2000);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 30000) {
    throw new Error('GATEWAY_UPSTREAM_TIMEOUT_MS must be an integer between 100 and 30000');
  }
  return timeoutMs;
}

export function loadGatewayConfig(environment: NodeJS.ProcessEnv = process.env): GatewayConfig {
  const routeMode = environment.GATEWAY_ROUTE_MODE === 'services' ? 'services' : 'monolith';
  return {
    routeMode,
    monolithBaseUrl: normalizeBaseUrl(environment.MONOLITH_BASE_URL, 'http://127.0.0.1:3000')!,
    identityBaseUrl: normalizeBaseUrl(environment.IDENTITY_SERVICE_URL),
    contentBaseUrl: normalizeBaseUrl(environment.CONTENT_SERVICE_URL),
    liveBaseUrl: normalizeBaseUrl(environment.LIVE_SERVICE_URL),
    governanceBaseUrl: normalizeBaseUrl(environment.GOVERNANCE_SERVICE_URL),
    fallbackEnabled: environment.GATEWAY_MONOLITH_FALLBACK !== 'false',
    timeoutMs: parseTimeout(environment.GATEWAY_UPSTREAM_TIMEOUT_MS),
  };
}

export function resolveUpstream(pathname: string, config: GatewayConfig): string {
  if (config.routeMode === 'monolith') return config.monolithBaseUrl;
  const apiPath = pathname.replace(/^\/api\/v1\//, '');
  if (/^(auth|users|messages|notifications|feed)(\/|$)/.test(apiPath)) return config.identityBaseUrl ?? config.monolithBaseUrl;
  if (/^(feeds|search|videos|creator|media-proxy)(\/|$)/.test(apiPath)) return config.contentBaseUrl ?? config.monolithBaseUrl;
  if (/^(lives|gift-coins)(\/|$)/.test(apiPath)) return config.liveBaseUrl ?? config.monolithBaseUrl;
  if (/^(admin|reports|agent)(\/|$)/.test(apiPath)) return config.governanceBaseUrl ?? config.monolithBaseUrl;
  return config.monolithBaseUrl;
}

export function resolveUpstreamName(pathname: string, config: GatewayConfig): 'monolith' | 'identity-community' | 'content-media' | 'live-reward' | 'governance-ai' {
  if (config.routeMode === 'monolith') return 'monolith';
  const apiPath = pathname.replace(/^\/api\/v1\//, '');
  if (/^(auth|users|messages|notifications|feed)(\/|$)/.test(apiPath) && config.identityBaseUrl) return 'identity-community';
  if (/^(feeds|search|videos|creator|media-proxy)(\/|$)/.test(apiPath) && config.contentBaseUrl) return 'content-media';
  if (/^(lives|gift-coins)(\/|$)/.test(apiPath) && config.liveBaseUrl) return 'live-reward';
  if (/^(admin|reports|agent)(\/|$)/.test(apiPath) && config.governanceBaseUrl) return 'governance-ai';
  return 'monolith';
}

function requestId(request: IncomingMessage): string {
  const value = request.headers['x-request-id'];
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, 128) : randomUUID();
}

function toFetchHeaders(input: IncomingHttpHeaders, traceId: string): Headers {
  const headers = new Headers();
  for (const [name, value] of Object.entries(input)) {
    if (value === undefined || HOP_BY_HOP_HEADERS.has(name.toLowerCase())) continue;
    headers.set(name, Array.isArray(value) ? value.join(', ') : value);
  }
  headers.set('x-request-id', traceId);
  headers.set('x-forwarded-by', 'videoplayer-gateway');
  return headers;
}

function writeJson(response: ServerResponse, statusCode: number, payload: unknown, traceId: string): void {
  const body = JSON.stringify(payload);
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'x-request-id': traceId,
    'x-service-version': process.env.GIT_SHA?.trim() || process.env.SERVICE_VERSION?.trim() || 'dev',
  });
  response.end(body);
}

async function proxyRequest(
  request: IncomingMessage,
  baseUrl: string,
  traceId: string,
  timeoutMs: number,
): Promise<Response> {
  const target = new URL(request.url ?? '/', `${baseUrl}/`);
  const method = request.method ?? 'GET';
  const init: RequestInit & { duplex?: 'half' } = {
    method,
    headers: toFetchHeaders(request.headers, traceId),
    redirect: 'manual',
    signal: AbortSignal.timeout(timeoutMs),
  };
  if (!['GET', 'HEAD'].includes(method)) {
    init.body = request as unknown as BodyInit;
    init.duplex = 'half';
  }
  return fetch(target, init);
}

async function forwardResponse(upstream: Response, response: ServerResponse, traceId: string, upstreamName: string): Promise<void> {
  response.statusCode = upstream.status;
  upstream.headers.forEach((value, name) => {
    if (!HOP_BY_HOP_HEADERS.has(name.toLowerCase())) response.setHeader(name, value);
  });
  response.setHeader('x-request-id', traceId);
  response.setHeader('x-gateway-upstream', upstreamName);
  if (!upstream.body) {
    response.end();
    return;
  }
  await new Promise<void>((resolve, reject) => {
    const body = Readable.fromWeb(upstream.body as never);
    body.on('error', reject);
    response.on('error', reject);
    response.on('finish', resolve);
    body.pipe(response);
  });
}

export function createGatewayServer(config: GatewayConfig = loadGatewayConfig()): Server {
  const startedAt = Date.now();
  return createServer(async (request, response) => {
    const traceId = requestId(request);
    const method = request.method ?? 'GET';
    const pathname = new URL(request.url ?? '/', 'http://127.0.0.1').pathname;
    const version = process.env.GIT_SHA?.trim() || process.env.SERVICE_VERSION?.trim() || 'dev';

    if (method === 'GET' && ['/health/live', '/health/ready', '/version'].includes(pathname)) {
      const data = pathname === '/version'
        ? { service: 'gateway', version, node: process.version, routeMode: config.routeMode }
        : { service: 'gateway', status: pathname.endsWith('ready') ? 'ready' : 'live', version, routeMode: config.routeMode, uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000) };
      writeJson(response, 200, ok(data, traceId), traceId);
      return;
    }

    const primary = resolveUpstream(pathname, config);
    let upstreamName = resolveUpstreamName(pathname, config);
    try {
      let upstream = await proxyRequest(request, primary, traceId, config.timeoutMs);
      const canFallback = ['GET', 'HEAD'].includes(method)
        && config.fallbackEnabled
        && primary !== config.monolithBaseUrl
        && upstream.status >= 500;
      if (canFallback) {
        await upstream.body?.cancel();
        upstream = await proxyRequest(request, config.monolithBaseUrl, traceId, config.timeoutMs);
        upstreamName = 'monolith';
      }
      await forwardResponse(upstream, response, traceId, upstreamName);
    } catch (error) {
      const canFallback = ['GET', 'HEAD'].includes(method) && config.fallbackEnabled && primary !== config.monolithBaseUrl;
      if (canFallback) {
        try {
          const upstream = await proxyRequest(request, config.monolithBaseUrl, traceId, config.timeoutMs);
          await forwardResponse(upstream, response, traceId, 'monolith');
          return;
        } catch {
          // Return the normalized gateway failure below.
        }
      }
      const message = error instanceof Error && error.name === 'TimeoutError' ? 'upstream timeout' : 'upstream unavailable';
      writeJson(response, 502, failure(message, traceId, 502), traceId);
    }
  });
}
