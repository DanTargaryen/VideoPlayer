import { randomUUID } from 'node:crypto';
import { createServer, type IncomingHttpHeaders, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { Readable } from 'node:stream';

import { failure, issueServiceToken, ok } from '@videoplayer/shared-contracts';

export type GatewayRouteMode = 'monolith' | 'services';
export type GatewayServiceName = 'identity-community' | 'content-media' | 'live-reward' | 'governance-ai';

export interface GatewayConfig {
  routeMode: GatewayRouteMode;
  monolithBaseUrl: string;
  identityBaseUrl?: string;
  contentBaseUrl?: string;
  liveBaseUrl?: string;
  governanceBaseUrl?: string;
  fallbackEnabled: boolean;
  timeoutMs: number;
  serviceJwtSecret?: string;
  readCutover: GatewayServiceName[];
  writeCutover: GatewayServiceName[];
}

const GATEWAY_SERVICES: GatewayServiceName[] = ['identity-community', 'content-media', 'live-reward', 'governance-ai'];
const DEFAULT_READ_CUTOVER: GatewayServiceName[] = ['identity-community', 'content-media'];

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

function parseCutoverServices(value: string | undefined, fallback: GatewayServiceName[]): GatewayServiceName[] {
  const configured = value === undefined ? fallback.join(',') : value.trim();
  if (!configured || configured === 'none') return [];
  const requested = configured === 'all' ? GATEWAY_SERVICES : configured.split(',').map((item) => item.trim()).filter(Boolean);
  const invalid = requested.filter((item) => !GATEWAY_SERVICES.includes(item as GatewayServiceName));
  if (invalid.length) throw new Error(`Unsupported Gateway cutover service: ${invalid.join(', ')}`);
  return [...new Set(requested as GatewayServiceName[])];
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
    serviceJwtSecret: environment.SERVICE_JWT_SECRET?.trim(),
    readCutover: parseCutoverServices(environment.GATEWAY_READ_CUTOVER, DEFAULT_READ_CUTOVER),
    writeCutover: parseCutoverServices(environment.GATEWAY_WRITE_CUTOVER, []),
  };
}

function capabilityOwner(pathname: string, method: string): GatewayServiceName | 'monolith' {
  if (!pathname.startsWith('/api/v1/')) return 'monolith';
  const apiPath = pathname.replace(/^\/api\/v1\//, '');
  const read = method === 'GET' || method === 'HEAD';
  if (read) {
    if (
      /^auth\/me$/.test(apiPath)
      || /^users\/profile\/recommendation$/.test(apiPath)
      || /^users\/[^/]+\/(?:homepage|followers|following)$/.test(apiPath)
      || /^notifications(?:\/unread-count)?$/.test(apiPath)
      || /^messages\/(?:conversations(?:\/[^/]+)?|unread-count)$/.test(apiPath)
      || /^feed\/(?:dynamic|sidebar\/(?:overview|recommended-users|recent-updates)|posts(?:\/[^/]+\/comments)?)$/.test(apiPath)
    ) return 'identity-community';
    if (
      /^(?:feeds\/recommend|search\/all)$/.test(apiPath)
      || /^videos\/(?!my(?:\/|$))[^/]+(?:\/recommendations|\/comments(?:\/[^/]+\/thread)?|\/danmaku|\/reviews)?$/.test(apiPath)
      || /^videos\/my\/(?:favorites|favorite-folders|likes|history)$/.test(apiPath)
      || /^creator\/(?:dashboard|videos(?:\/play-trend)?|followers\/trend)$/.test(apiPath)
      || /^media\/objects\/.+$/.test(apiPath)
    ) return 'content-media';
    if (
      /^lives\/rooms(?:\/\d+(?:\/(?:messages|events))?)?$/.test(apiPath)
      || /^lives\/sessions\/\d+$/.test(apiPath)
      || /^gift-coins\/(?:wallet|streak)$/.test(apiPath)
    ) return 'live-reward';
    if (/^admin\/(?:dashboard|reports|reviews\/(?:videos|text-content))$/.test(apiPath)) return 'governance-ai';
    return 'monolith';
  }
  if (
    /^(?:auth\/(?:register|login)|users\/profile(?:\/recommendation\/rebuild)?)$/.test(apiPath)
    || /^users\/[^/]+\/follow$/.test(apiPath)
    || /^notifications\/(?:read-all|[^/]+\/read)$/.test(apiPath)
    || /^messages\/(?:conversations\/[^/]+|read-all)$/.test(apiPath)
    || /^feed\/posts(?:\/[^/]+\/(?:like|comments))?$/.test(apiPath)
  ) return 'identity-community';
  if (
    /^videos\/[^/]+\/(?:submit-review|like|favorite|play|watch-progress|danmaku)$/.test(apiPath)
    || /^videos\/[^/]+\/comments(?:\/[^/]+)?$/.test(apiPath)
    || /^videos\/my\/favorite-folders(?:\/[^/]+)?$/.test(apiPath)
    || /^videos(?:\/upload|\/[^/]+(?:\/withdraw-review)?)?$/.test(apiPath)
  ) return 'content-media';
  if (
    /^lives\/rooms(?:\/\d+\/(?:start|stop|viewers|messages|publish|play|replay))?$/.test(apiPath)
    || /^lives\/rooms\/\d+\/viewers\/[^/]+$/.test(apiPath)
    || /^gift-coins\/(?:daily-claim|streak-claim|gift|video(?:\/\d+)?)$/.test(apiPath)
    || /^videos\/[^/]+\/coin$/.test(apiPath)
  ) return 'live-reward';
  if (
    /^reports$/.test(apiPath)
    || /^admin\/(?:reports\/\d+|reviews\/videos\/\d+|reviews\/text-content\/(?:COMMENT|VIDEO_DANMAKU)\/[^/]+)$/.test(apiPath)
    || /^agent\/review-preview$/.test(apiPath)
  ) return 'governance-ai';
  return 'monolith';
}

function serviceBaseUrl(service: GatewayServiceName, config: GatewayConfig): string | undefined {
  if (service === 'identity-community') return config.identityBaseUrl;
  if (service === 'content-media') return config.contentBaseUrl;
  if (service === 'live-reward') return config.liveBaseUrl;
  return config.governanceBaseUrl;
}

function cutoverEnabled(service: GatewayServiceName, method: string, config: GatewayConfig): boolean {
  const enabled = method === 'GET' || method === 'HEAD' ? config.readCutover : config.writeCutover;
  return enabled.includes(service);
}

export function resolveUpstreamName(pathname: string, config: GatewayConfig, method = 'GET'): 'monolith' | GatewayServiceName {
  if (config.routeMode === 'monolith') return 'monolith';
  const owner = capabilityOwner(pathname, method.toUpperCase());
  if (owner === 'monolith' || !cutoverEnabled(owner, method.toUpperCase(), config) || !serviceBaseUrl(owner, config)) return 'monolith';
  return owner;
}

export function resolveUpstream(pathname: string, config: GatewayConfig, method = 'GET'): string {
  const owner = resolveUpstreamName(pathname, config, method);
  return owner === 'monolith' ? config.monolithBaseUrl : serviceBaseUrl(owner, config) ?? config.monolithBaseUrl;
}

function requestId(request: IncomingMessage): string {
  const value = request.headers['x-request-id'];
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, 128) : randomUUID();
}

interface TrustedUserContext {
  id: number;
  nickname: string;
  role: string;
  gatewayAuthorization: string;
}

class GatewayHttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = 'GatewayHttpError';
  }
}

function toFetchHeaders(input: IncomingHttpHeaders, traceId: string, trustedUser?: TrustedUserContext): Headers {
  const headers = new Headers();
  for (const [name, value] of Object.entries(input)) {
    const normalizedName = name.toLowerCase();
    if (
      value === undefined
      || HOP_BY_HOP_HEADERS.has(normalizedName)
      || ['x-user-id', 'x-user-nickname', 'x-user-role', 'x-gateway-authorization'].includes(normalizedName)
    ) continue;
    headers.set(name, Array.isArray(value) ? value.join(', ') : value);
  }
  headers.set('x-request-id', traceId);
  headers.set('x-forwarded-by', 'videoplayer-gateway');
  if (trustedUser) {
    headers.set('x-user-id', String(trustedUser.id));
    // Undici's Headers implementation only accepts ByteString values. Encode
    // Unicode display names for transport and decode them in trusted services.
    headers.set('x-user-nickname', encodeURIComponent(trustedUser.nickname));
    headers.set('x-user-role', trustedUser.role);
    headers.set('x-gateway-authorization', trustedUser.gatewayAuthorization);
  }
  return headers;
}

async function resolveTrustedUser(
  request: IncomingMessage,
  config: GatewayConfig,
  traceId: string,
  audience: 'content-media' | 'live-reward' | 'governance-ai',
): Promise<TrustedUserContext | undefined> {
  const authorization = request.headers.authorization;
  if (typeof authorization !== 'string' || !authorization.trim()) return undefined;
  if (!config.identityBaseUrl) throw new GatewayHttpError(503, 'identity service is not configured');
  if (!config.serviceJwtSecret || config.serviceJwtSecret.length < 32) {
    throw new GatewayHttpError(503, 'gateway service authentication is not configured');
  }
  let response: Response;
  try {
    response = await fetch(`${config.identityBaseUrl}/api/v1/auth/me`, {
      headers: { authorization, 'x-request-id': traceId },
      signal: AbortSignal.timeout(config.timeoutMs),
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') throw new GatewayHttpError(504, 'identity authentication timed out');
    throw new GatewayHttpError(503, 'identity authentication is unavailable');
  }
  if (response.status === 401 || response.status === 403) throw new GatewayHttpError(401, 'authentication failed');
  if (!response.ok) throw new GatewayHttpError(503, `identity authentication returned ${response.status}`);
  const payload = await response.json() as { data?: { id?: unknown; nickname?: unknown; role?: unknown } };
  const id = Number(payload.data?.id);
  if (!Number.isInteger(id) || id < 1) throw new GatewayHttpError(503, 'identity authentication returned an invalid user');
  const nickname = typeof payload.data?.nickname === 'string' && payload.data.nickname.trim()
    ? payload.data.nickname.trim().slice(0, 64)
    : `user-${id}`;
  const role = typeof payload.data?.role === 'string' && payload.data.role.trim()
    ? payload.data.role.trim().toUpperCase().slice(0, 32)
    : 'USER';
  const scope = audience === 'live-reward'
    ? 'live.user.forward'
    : audience === 'content-media'
      ? 'content.user.forward'
      : 'governance.user.forward';
  const token = issueServiceToken({
    caller: 'gateway',
    audience,
    scopes: [scope],
    secret: config.serviceJwtSecret,
    requestId: traceId,
  });
  return { id, nickname, role, gatewayAuthorization: `Bearer ${token}` };
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
  trustedUser?: TrustedUserContext,
): Promise<Response> {
  const target = new URL(request.url ?? '/', `${baseUrl}/`);
  const method = request.method ?? 'GET';
  const init: RequestInit & { duplex?: 'half' } = {
    method,
    headers: toFetchHeaders(request.headers, traceId, trustedUser),
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
        ? { service: 'gateway', version, node: process.version, routeMode: config.routeMode, readCutover: config.readCutover, writeCutover: config.writeCutover }
        : { service: 'gateway', status: pathname.endsWith('ready') ? 'ready' : 'live', version, routeMode: config.routeMode, readCutover: config.readCutover, writeCutover: config.writeCutover, uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000) };
      writeJson(response, 200, ok(data, traceId), traceId);
      return;
    }

    const primary = resolveUpstream(pathname, config, method);
    let upstreamName = resolveUpstreamName(pathname, config, method);
    try {
      const trustedAudience = upstreamName === 'live-reward' || upstreamName === 'governance-ai'
        ? upstreamName
        : upstreamName === 'content-media'
          ? 'content-media'
          : undefined;
      const trustedUser = trustedAudience
        ? await resolveTrustedUser(request, config, traceId, trustedAudience)
        : undefined;
      let upstream = await proxyRequest(request, primary, traceId, config.timeoutMs, trustedUser);
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
      if (error instanceof GatewayHttpError) {
        writeJson(response, error.status, failure(error.message, traceId, error.status), traceId);
        return;
      }
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
