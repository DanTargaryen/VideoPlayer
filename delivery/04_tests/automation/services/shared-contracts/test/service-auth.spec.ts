import { describe, expect, it } from 'vitest';

import { authorizeServiceRequest, issueServiceToken, verifyServiceToken } from '../src/service-auth.js';

const secret = 'ms00-test-secret-with-at-least-32-characters';

describe('service JWT', () => {
  it('issues and verifies scoped short-lived credentials', () => {
    const token = issueServiceToken({
      caller: 'content-media',
      audience: 'identity-community',
      scopes: ['internal:user-summary'],
      requestId: 'request-1',
      secret,
      nowSeconds: 100,
    });
    const claims = verifyServiceToken(token, {
      audience: 'identity-community',
      requiredScopes: ['internal:user-summary'],
      allowedCallers: ['content-media'],
      secret,
      nowSeconds: 120,
    });
    expect(claims.sub).toBe('content-media');
    expect(claims.requestId).toBe('request-1');
  });

  it('rejects expired, wrong-audience, missing-scope and tampered tokens', () => {
    const token = issueServiceToken({
      caller: 'governance-ai',
      audience: 'content-media',
      scopes: ['internal:review-decision'],
      secret,
      nowSeconds: 100,
      ttlSeconds: 30,
    });
    expect(() => verifyServiceToken(token, { audience: 'content-media', secret, nowSeconds: 130 })).toThrow('Expired');
    expect(() => verifyServiceToken(token, { audience: 'identity-community', secret, nowSeconds: 110 })).toThrow('audience');
    expect(() => verifyServiceToken(token, { audience: 'content-media', requiredScopes: ['internal:text-status'], secret, nowSeconds: 110 })).toThrow('missing required scopes');
    expect(() => verifyServiceToken(`${token.slice(0, -1)}x`, { audience: 'content-media', secret, nowSeconds: 110 })).toThrow('signature');
  });

  it('requires an adequately sized secret', () => {
    expect(() => issueServiceToken({ caller: 'gateway', audience: 'identity-community', scopes: [], secret: 'short' })).toThrow('32 characters');
  });

  it('rejects tokens whose issued-at time is unreasonably far in the future', () => {
    const token = issueServiceToken({ caller: 'gateway', audience: 'identity-community', scopes: [], secret, nowSeconds: 200 });
    expect(() => verifyServiceToken(token, { audience: 'identity-community', secret, nowSeconds: 100 })).toThrow('future');
  });

  it('authorizes bearer headers and rejects missing or malformed credentials', () => {
    const token = issueServiceToken({
      caller: 'gateway',
      audience: 'identity-community',
      scopes: ['internal:user-summary'],
      secret,
      nowSeconds: 100,
    });
    expect(authorizeServiceRequest(`Bearer ${token}`, {
      audience: 'identity-community',
      requiredScopes: ['internal:user-summary'],
      allowedCallers: ['gateway'],
      secret,
      nowSeconds: 110,
    }).sub).toBe('gateway');
    expect(() => authorizeServiceRequest(undefined, { audience: 'identity-community', secret })).toThrow('required');
    expect(() => authorizeServiceRequest('Basic invalid', { audience: 'identity-community', secret })).toThrow('Malformed');
  });
});
