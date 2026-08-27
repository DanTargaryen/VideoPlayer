import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

import { SERVICE_NAMES, type ServiceName } from './contracts.js';

const JWT_HEADER = Object.freeze({ alg: 'HS256', typ: 'JWT' });

export interface ServiceTokenClaims {
  iss: 'videoplayer-internal';
  sub: ServiceName;
  aud: ServiceName;
  scope: string[];
  requestId: string;
  iat: number;
  exp: number;
}

export interface IssueServiceTokenOptions {
  caller: ServiceName;
  audience: ServiceName;
  scopes: string[];
  secret: string;
  requestId?: string;
  ttlSeconds?: number;
  nowSeconds?: number;
}

export interface VerifyServiceTokenOptions {
  audience: ServiceName;
  secret: string;
  requiredScopes?: string[];
  allowedCallers?: ServiceName[];
  nowSeconds?: number;
}

export type AuthorizationHeader = string | string[] | undefined;

function encodeJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

function sign(input: string, secret: string): string {
  return createHmac('sha256', secret).update(input).digest('base64url');
}

function assertSecret(secret: string): void {
  if (secret.length < 32) {
    throw new Error('Service JWT secret must contain at least 32 characters');
  }
}

export function issueServiceToken(options: IssueServiceTokenOptions): string {
  assertSecret(options.secret);
  const now = options.nowSeconds ?? Math.floor(Date.now() / 1000);
  const ttlSeconds = options.ttlSeconds ?? 60;
  if (!Number.isInteger(ttlSeconds) || ttlSeconds < 1 || ttlSeconds > 300) {
    throw new Error('Service JWT ttlSeconds must be an integer between 1 and 300');
  }

  const claims: ServiceTokenClaims = {
    iss: 'videoplayer-internal',
    sub: options.caller,
    aud: options.audience,
    scope: [...new Set(options.scopes)].sort(),
    requestId: options.requestId ?? randomUUID(),
    iat: now,
    exp: now + ttlSeconds,
  };
  const encodedHeader = encodeJson(JWT_HEADER);
  const encodedClaims = encodeJson(claims);
  const signingInput = `${encodedHeader}.${encodedClaims}`;
  return `${signingInput}.${sign(signingInput, options.secret)}`;
}

export function verifyServiceToken(token: string, options: VerifyServiceTokenOptions): ServiceTokenClaims {
  assertSecret(options.secret);
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Malformed service JWT');
  }

  const [encodedHeader, encodedClaims, signature] = parts as [string, string, string];
  const signingInput = `${encodedHeader}.${encodedClaims}`;
  const expected = Buffer.from(sign(signingInput, options.secret));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    throw new Error('Invalid service JWT signature');
  }

  const header = JSON.parse(Buffer.from(encodedHeader, 'base64url').toString('utf8')) as typeof JWT_HEADER;
  if (header.alg !== 'HS256' || header.typ !== 'JWT') {
    throw new Error('Unsupported service JWT header');
  }

  const claims = JSON.parse(Buffer.from(encodedClaims, 'base64url').toString('utf8')) as ServiceTokenClaims;
  const now = options.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (claims.iss !== 'videoplayer-internal') {
    throw new Error('Invalid service JWT issuer');
  }
  if (claims.aud !== options.audience) {
    throw new Error('Invalid service JWT audience');
  }
  if (!SERVICE_NAMES.includes(claims.sub) || !SERVICE_NAMES.includes(claims.aud)) {
    throw new Error('Invalid service JWT service name');
  }
  if (!Number.isInteger(claims.iat) || !Number.isInteger(claims.exp) || claims.exp <= now) {
    throw new Error('Expired service JWT');
  }
  if (claims.iat > now + 30) {
    throw new Error('Service JWT issued-at time is in the future');
  }
  if (!Array.isArray(claims.scope) || !claims.scope.every((scope) => typeof scope === 'string')) {
    throw new Error('Invalid service JWT scope');
  }
  if (options.allowedCallers && !options.allowedCallers.includes(claims.sub)) {
    throw new Error('Service JWT caller is not allowed');
  }

  const missingScopes = (options.requiredScopes ?? []).filter((scope) => !claims.scope.includes(scope));
  if (missingScopes.length > 0) {
    throw new Error(`Service JWT is missing required scopes: ${missingScopes.join(', ')}`);
  }
  if (!claims.requestId) {
    throw new Error('Service JWT requestId is required');
  }
  return claims;
}

export function authorizeServiceRequest(
  authorization: AuthorizationHeader,
  options: VerifyServiceTokenOptions,
): ServiceTokenClaims {
  if (typeof authorization !== 'string') {
    throw new Error('Service Authorization header is required');
  }
  const match = authorization.match(/^Bearer\s+([^\s]+)$/i);
  if (!match) {
    throw new Error('Malformed service Authorization header');
  }
  return verifyServiceToken(match[1]!, options);
}
