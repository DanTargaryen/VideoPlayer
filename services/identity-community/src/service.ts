import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';

import {
  authorizeServiceRequest,
  failure,
  ok,
  resolvePort,
  type IdentityBatchSummaryContract,
  type ServiceRuntimeOptions,
} from '@videoplayer/shared-contracts';
import { Prisma, PrismaClient } from '@prisma/client';

import { IdentityStore, IdentityStoreError, type NotificationType } from './identity-store.js';
import { PrismaIdentityStore } from './prisma-identity-store.js';

export const SERVICE_OPTIONS: ServiceRuntimeOptions = {
  serviceName: 'identity-community',
  defaultPort: 3101,
};

const INTERNAL_ALLOWED_CALLERS = ['gateway', 'content-media', 'live-reward', 'governance-ai'] as const;
type IdentityStorePort = IdentityStore | PrismaIdentityStore;

interface IdentityServiceOptions {
  store?: IdentityStorePort;
  serviceJwtSecret?: string;
  databaseUrl?: string;
  adminSecret?: string;
}

function resolveVersion() {
  return process.env.GIT_SHA?.trim() || process.env.SERVICE_VERSION?.trim() || 'dev';
}

function requestId(request: IncomingMessage) {
  const value = request.headers['x-request-id'];
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, 128) : randomUUID();
}

function normalizePublicPath(pathname: string) {
  return pathname.startsWith('/api/v1') ? pathname.slice('/api/v1'.length) || '/' : pathname;
}

function writeJson(response: ServerResponse, statusCode: number, payload: unknown, traceId: string) {
  const body = JSON.stringify(payload);
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'x-request-id': traceId,
    'x-service-version': resolveVersion(),
  });
  response.end(body);
}

async function readJsonBody(request: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    chunks.push(buffer);
    if (chunks.reduce((total, item) => total + item.length, 0) > 1024 * 1024) {
      throw new IdentityStoreError(413, 'Request body is too large');
    }
  }
  const text = Buffer.concat(chunks).toString('utf8').trim();
  if (!text) {
    return {};
  }
  return JSON.parse(text) as Record<string, unknown>;
}

function parseNumber(value: string | undefined) {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : undefined;
}

function parseList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => Number(item)).filter((item) => Number.isInteger(item) && item > 0);
}

function handleError(response: ServerResponse, traceId: string, error: unknown) {
  if (error instanceof IdentityStoreError) {
    writeJson(response, error.statusCode, failure(error.message, traceId, error.statusCode), traceId);
    return;
  }
  if (error instanceof SyntaxError) {
    writeJson(response, 400, failure('Invalid JSON body', traceId, 400), traceId);
    return;
  }
  if (error instanceof Error && /(Authorization|Service JWT|scope|audience|caller|secret)/i.test(error.message)) {
    writeJson(response, 401, failure(error.message, traceId, 401), traceId);
    return;
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      writeJson(response, 409, failure('A unique identity record already exists', traceId, 409), traceId);
      return;
    }
    if (error.code === 'P2025') {
      writeJson(response, 404, failure('Identity record not found', traceId, 404), traceId);
      return;
    }
  }
  if (
    error instanceof Prisma.PrismaClientInitializationError
    || error instanceof Prisma.PrismaClientRustPanicError
    || (error instanceof Error && /P1000|P1001|P1002|P1017|database.*unavailable/i.test(error.message))
  ) {
    writeJson(response, 503, failure('Identity database is unavailable', traceId, 503), traceId);
    return;
  }
  writeJson(response, 500, failure('Internal server error', traceId, 500), traceId);
}

function authorizeInternalRequest(authorization: unknown, secret: string, requiredScopes: string[]) {
  if (secret.trim().length < 32) {
    throw new IdentityStoreError(503, 'Service JWT secret is not configured');
  }
  return authorizeServiceRequest(authorization as string | string[] | undefined, {
    audience: 'identity-community',
    requiredScopes,
    allowedCallers: [...INTERNAL_ALLOWED_CALLERS],
    secret,
  });
}

export function createIdentityService(options: IdentityServiceOptions = {}): Server {
  const serviceJwtSecret = options.serviceJwtSecret ?? process.env.SERVICE_JWT_SECRET ?? '';
  const startedAt = Date.now();
  const databaseUrl = options.databaseUrl?.trim() || process.env.IDENTITY_DATABASE_URL?.trim() || '';
  const adminSecret = options.adminSecret?.trim()
    || process.env.IDENTITY_ADMIN_SECRET?.trim()
    || process.env.ADMIN_SECRET?.trim()
    || '';
  let store: IdentityStorePort | null = options.store ?? null;
  let databaseClient: PrismaClient | null = null;
  let databaseReady = Boolean(store);
  let configurationError: string | null = null;

  if (!store && !databaseUrl) {
    configurationError = 'IDENTITY_DATABASE_URL is not configured';
  } else if (!store && !adminSecret) {
    configurationError = 'IDENTITY_ADMIN_SECRET is not configured';
  } else if (!store) {
    databaseClient = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
    store = new PrismaIdentityStore(databaseClient, adminSecret);
    void databaseClient.$connect()
      .then(() => {
        databaseReady = true;
      })
      .catch((error: unknown) => {
        databaseReady = false;
        console.error(JSON.stringify({
          timestamp: new Date().toISOString(),
          service: SERVICE_OPTIONS.serviceName,
          event: 'database_connect_failed',
          message: error instanceof Error ? error.message : String(error),
        }));
      });
  }

  const server = createServer(async (request, response) => {
    const traceId = requestId(request);
    const method = request.method ?? 'GET';
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    const pathname = url.pathname;

    try {
      if (method === 'GET' && pathname === '/health/live') {
        writeJson(
          response,
          200,
          ok(
            {
              service: SERVICE_OPTIONS.serviceName,
              status: 'live',
              version: resolveVersion(),
              uptimeSeconds: Math.max(0, Math.floor((Date.now() - startedAt) / 1000)),
            },
            traceId,
          ),
          traceId,
        );
        return;
      }

      if (method === 'GET' && pathname === '/health/ready') {
        if (databaseClient) {
          try {
            await databaseClient.$queryRawUnsafe('SELECT 1');
            databaseReady = true;
          } catch {
            databaseReady = false;
          }
        }
        if (!store || !databaseReady) {
          writeJson(
            response,
            503,
            failure(configurationError ?? 'identity database is not ready', traceId, 503),
            traceId,
          );
          return;
        }
        writeJson(
          response,
          200,
          ok(
            {
              service: SERVICE_OPTIONS.serviceName,
              status: 'ready',
              version: resolveVersion(),
              uptimeSeconds: Math.max(0, Math.floor((Date.now() - startedAt) / 1000)),
            },
            traceId,
          ),
          traceId,
        );
        return;
      }

      if (method === 'GET' && pathname === '/version') {
        writeJson(
          response,
          200,
          ok(
            {
              service: SERVICE_OPTIONS.serviceName,
              version: resolveVersion(),
              node: process.version,
            },
            traceId,
          ),
          traceId,
        );
        return;
      }

      if (!store || !databaseReady) {
        throw new IdentityStoreError(503, configurationError ?? 'Identity database is not ready');
      }

      if (pathname.startsWith('/internal/v1/')) {
        await handleInternalRoute({
          method,
          pathname,
          request,
          response,
          traceId,
          store,
          serviceJwtSecret,
        });
        return;
      }

      const publicPath = normalizePublicPath(pathname);
      await handlePublicRoute({
        method,
        pathname: publicPath,
        request,
        response,
        traceId,
        store,
      });
    } catch (error) {
      handleError(response, traceId, error);
    }
  });

  server.on('close', () => {
    if (databaseClient) {
      void databaseClient.$disconnect();
    }
  });

  return server;
}

async function handlePublicRoute(options: {
  method: string;
  pathname: string;
  request: IncomingMessage;
  response: ServerResponse;
  traceId: string;
  store: IdentityStorePort;
}) {
  const { method, pathname, request, response, traceId, store } = options;
  const requestUrl = new URL(request.url ?? '/', 'http://127.0.0.1');
  const currentUser = await store.getCurrentUser(request.headers.authorization);

  if (method === 'POST' && pathname === '/auth/register') {
    const body = (await readJsonBody(request)) as { username?: string; password?: string; nickname?: string; email?: string };
    writeJson(response, 200, ok(await store.register(body as Parameters<IdentityStore['register']>[0]), traceId), traceId);
    return;
  }

  if (method === 'POST' && pathname === '/auth/login') {
    const body = (await readJsonBody(request)) as { account?: string; identifier?: string; password?: string; adminSecret?: string };
    writeJson(response, 200, ok(await store.login(body.account ?? body.identifier, body.password, body.adminSecret), traceId), traceId);
    return;
  }

  if (method === 'GET' && pathname === '/auth/me') {
    const user = await store.getCurrentAuthenticatedUser(request.headers.authorization);
    if (!user) {
      throw new IdentityStoreError(401, 'Login required');
    }
    writeJson(response, 200, ok(user, traceId), traceId);
    return;
  }

  if (method === 'PUT' && pathname === '/users/profile') {
    const user = await store.requireUser(request.headers.authorization);
    const body = (await readJsonBody(request)) as {
      nickname?: string;
      avatarUrl?: string;
      bio?: string;
      email?: string;
      messagePrivacy?: 'ALLOW_ALL' | 'FOLLOWING_ONLY' | 'DISABLED';
    };
    writeJson(response, 200, ok(await store.updateProfile(user.id, body), traceId), traceId);
    return;
  }

  if (method === 'GET' && pathname === '/users/profile/recommendation') {
    const user = await store.requireUser(request.headers.authorization);
    writeJson(response, 200, ok(await store.getRecommendationProfile(user.id), traceId), traceId);
    return;
  }

  if (method === 'POST' && pathname === '/users/profile/recommendation/rebuild') {
    const user = await store.requireUser(request.headers.authorization);
    writeJson(response, 200, ok(await store.rebuildRecommendationProfile(user.id), traceId), traceId);
    return;
  }

  const homepageMatch = /^\/users\/(\d+)\/homepage$/.exec(pathname);
  if (method === 'GET' && homepageMatch) {
    const id = Number(homepageMatch[1]);
    writeJson(response, 200, ok(await store.getHomepage(id, currentUser?.id), traceId), traceId);
    return;
  }

  const followMatch = /^\/users\/(\d+)\/follow$/.exec(pathname);
  if (followMatch && method === 'POST') {
    const user = await store.requireUser(request.headers.authorization);
    writeJson(response, 200, ok(await store.follow(Number(followMatch[1]), user.id), traceId), traceId);
    return;
  }
  if (followMatch && method === 'DELETE') {
    const user = await store.requireUser(request.headers.authorization);
    writeJson(response, 200, ok(await store.unfollow(Number(followMatch[1]), user.id), traceId), traceId);
    return;
  }

  const followersMatch = /^\/users\/(\d+)\/followers$/.exec(pathname);
  if (method === 'GET' && followersMatch) {
    writeJson(response, 200, ok(await store.getFollowers(Number(followersMatch[1])), traceId), traceId);
    return;
  }

  const followingMatch = /^\/users\/(\d+)\/following$/.exec(pathname);
  if (method === 'GET' && followingMatch) {
    writeJson(response, 200, ok(await store.getFollowing(Number(followingMatch[1])), traceId), traceId);
    return;
  }

  if (method === 'GET' && pathname === '/notifications') {
    const user = await store.requireUser(request.headers.authorization);
    writeJson(response, 200, ok(await store.listNotifications(user.id), traceId), traceId);
    return;
  }

  if (method === 'GET' && pathname === '/notifications/unread-count') {
    const user = await store.requireUser(request.headers.authorization);
    writeJson(response, 200, ok({ unreadCount: await store.getUnreadNotificationCount(user.id) }, traceId), traceId);
    return;
  }

  if (method === 'POST' && pathname === '/notifications/read-all') {
    const user = await store.requireUser(request.headers.authorization);
    writeJson(response, 200, ok(await store.markAllNotificationsRead(user.id), traceId), traceId);
    return;
  }

  const notificationReadMatch = /^\/notifications\/(\d+)\/read$/.exec(pathname);
  if (method === 'POST' && notificationReadMatch) {
    const user = await store.requireUser(request.headers.authorization);
    writeJson(response, 200, ok(await store.markNotificationRead(user.id, Number(notificationReadMatch[1])), traceId), traceId);
    return;
  }

  if (method === 'GET' && pathname === '/messages/conversations') {
    const user = await store.requireUser(request.headers.authorization);
    writeJson(response, 200, ok(await store.listDirectMessageConversations(user.id), traceId), traceId);
    return;
  }

  const conversationMatch = /^\/messages\/conversations\/(\d+)$/.exec(pathname);
  if (conversationMatch && method === 'GET') {
    const user = await store.requireUser(request.headers.authorization);
    writeJson(response, 200, ok(await store.getDirectMessageConversation(user.id, Number(conversationMatch[1])), traceId), traceId);
    return;
  }
  if (conversationMatch && method === 'POST') {
    const user = await store.requireUser(request.headers.authorization);
    const body = (await readJsonBody(request)) as { content?: string };
    writeJson(response, 200, ok(await store.sendDirectMessage(user.id, Number(conversationMatch[1]), body.content ?? ''), traceId), traceId);
    return;
  }

  if (method === 'GET' && pathname === '/messages/unread-count') {
    const user = await store.requireUser(request.headers.authorization);
    writeJson(response, 200, ok({ unreadCount: await store.getUnreadDirectMessageCount(user.id) }, traceId), traceId);
    return;
  }

  if (method === 'POST' && pathname === '/messages/read-all') {
    const user = await store.requireUser(request.headers.authorization);
    writeJson(response, 200, ok(await store.markAllDirectMessagesRead(user.id), traceId), traceId);
    return;
  }

  if (method === 'GET' && pathname === '/feed/dynamic') {
    const currentUserId = currentUser?.id;
    writeJson(
      response,
      200,
      ok(
        await store.getDynamicFeed({
          currentUserId,
          type: requestUrl.searchParams.get('type') ?? undefined,
          page: parseNumber(requestUrl.searchParams.get('page') ?? undefined),
          pageSize: parseNumber(requestUrl.searchParams.get('pageSize') ?? undefined),
          authorId: parseNumber(requestUrl.searchParams.get('authorId') ?? undefined),
        }),
        traceId,
      ),
      traceId,
    );
    return;
  }

  if (method === 'GET' && pathname === '/feed/sidebar/overview') {
    writeJson(response, 200, ok(await store.getSidebarOverview(currentUser?.id), traceId), traceId);
    return;
  }

  if (method === 'GET' && pathname === '/feed/sidebar/recommended-users') {
    writeJson(response, 200, ok({ list: await store.getRecommendedUsers(currentUser?.id) }, traceId), traceId);
    return;
  }

  if (method === 'GET' && pathname === '/feed/sidebar/recent-updates') {
    writeJson(response, 200, ok({ list: await store.getRecentUpdates(currentUser?.id) }, traceId), traceId);
    return;
  }

  if (pathname === '/feed/posts' && method === 'GET') {
    writeJson(response, 200, ok({ list: await store.listDynamicPosts(currentUser?.id) }, traceId), traceId);
    return;
  }

  if (pathname === '/feed/posts' && method === 'POST') {
    const user = await store.requireUser(request.headers.authorization);
    const body = (await readJsonBody(request)) as { content?: string; images?: string[] };
    writeJson(response, 200, ok(await store.createDynamicPost(user.id, body.content ?? '', body.images ?? []), traceId), traceId);
    return;
  }

  const postLikeMatch = /^\/feed\/posts\/(\d+)\/like$/.exec(pathname);
  if (postLikeMatch && method === 'POST') {
    const user = await store.requireUser(request.headers.authorization);
    writeJson(response, 200, ok(await store.likeDynamicPost(Number(postLikeMatch[1]), user.id), traceId), traceId);
    return;
  }
  if (postLikeMatch && method === 'DELETE') {
    const user = await store.requireUser(request.headers.authorization);
    writeJson(response, 200, ok(await store.unlikeDynamicPost(Number(postLikeMatch[1]), user.id), traceId), traceId);
    return;
  }

  const postCommentsMatch = /^\/feed\/posts\/(\d+)\/comments$/.exec(pathname);
  if (postCommentsMatch && method === 'GET') {
    writeJson(response, 200, ok(await store.listDynamicPostComments(Number(postCommentsMatch[1])), traceId), traceId);
    return;
  }
  if (postCommentsMatch && method === 'POST') {
    const user = await store.requireUser(request.headers.authorization);
    const body = (await readJsonBody(request)) as { content?: string };
    writeJson(response, 200, ok(await store.createDynamicPostComment(Number(postCommentsMatch[1]), user.id, body.content ?? ''), traceId), traceId);
    return;
  }

  writeJson(response, 404, failure('route not implemented in identity-community', traceId, 404), traceId);
}

async function handleInternalRoute(options: {
  method: string;
  pathname: string;
  request: IncomingMessage;
  response: ServerResponse;
  traceId: string;
  store: IdentityStorePort;
  serviceJwtSecret: string;
}) {
  const { method, pathname, request, response, traceId, store, serviceJwtSecret } = options;

  if (method === 'POST' && pathname === '/internal/v1/users/batch-summary') {
    const claims = authorizeInternalRequest(request.headers.authorization, serviceJwtSecret, ['internal:user-summary']);
    const body = (await readJsonBody(request)) as { userIds?: unknown; ids?: unknown };
    const userIds = parseList(body.userIds ?? body.ids);
    const summary: IdentityBatchSummaryContract = await store.batchSummary(userIds);
    writeJson(response, 200, ok(summary, claims.requestId), claims.requestId);
    return;
  }

  const existsMatch = /^\/internal\/v1\/users\/(\d+)\/exists$/.exec(pathname);
  if (method === 'GET' && existsMatch) {
    const claims = authorizeInternalRequest(request.headers.authorization, serviceJwtSecret, ['internal:user-exists']);
    const userId = Number(existsMatch[1]);
    writeJson(response, 200, ok({ exists: await store.userExists(userId) }, claims.requestId), claims.requestId);
    return;
  }

  const creatorStatsMatch = /^\/internal\/v1\/users\/(\d+)\/creator-stats$/.exec(pathname);
  if (method === 'GET' && creatorStatsMatch) {
    const claims = authorizeInternalRequest(request.headers.authorization, serviceJwtSecret, ['internal:user-summary']);
    writeJson(response, 200, ok(await store.getCreatorStats(Number(creatorStatsMatch[1]), 7), claims.requestId), claims.requestId);
    return;
  }

  if (method === 'POST' && pathname === '/internal/v1/notifications') {
    const claims = authorizeInternalRequest(request.headers.authorization, serviceJwtSecret, ['internal:notification-write']);
    const body = (await readJsonBody(request)) as {
      recipientId?: unknown;
      actorId?: unknown;
      type?: NotificationType;
      title?: string;
      content?: string;
      relatedType?: string | null;
      relatedId?: number | null;
    };
    if (!Number.isInteger(Number(body.recipientId)) || !body.type || !body.title || !body.content) {
      throw new IdentityStoreError(400, 'recipientId, type, title and content are required');
    }
    writeJson(
      response,
      200,
      ok(
        await store.createNotification({
          recipientId: Number(body.recipientId),
          actorId: body.actorId === undefined || body.actorId === null ? null : Number(body.actorId),
          type: body.type,
          title: body.title,
          content: body.content,
          relatedType: body.relatedType ?? null,
          relatedId: body.relatedId ?? null,
          requestId: claims.requestId,
        }),
        claims.requestId,
      ),
      claims.requestId,
    );
    return;
  }

  writeJson(response, 404, failure('route not implemented in identity-community', traceId, 404), traceId);
}

export function startIdentityService(options: IdentityServiceOptions = {}) {
  const port = resolvePort(SERVICE_OPTIONS.defaultPort);
  const server = createIdentityService(options);
  server.listen(port, '0.0.0.0', () => {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      service: SERVICE_OPTIONS.serviceName,
      event: 'service_started',
      port,
      version: resolveVersion(),
    }));
  });
  return server;
}
