import { describe, expect, it } from 'vitest';

import {
  INTERNAL_CONTRACT_VERSION,
  assertApiResponse,
  assertContentReplay,
  assertIdentityBatchSummary,
} from '../src/internal-contracts.js';

describe(`internal contracts ${INTERNAL_CONTRACT_VERSION}`, () => {
  it('accepts compatible response shapes', () => {
    expect(() => assertApiResponse({ code: 0, message: 'ok', data: {}, requestId: 'request-1' })).not.toThrow();
    expect(() => assertIdentityBatchSummary({
      requestedIds: [1],
      items: [{ id: 1, nickname: 'User', avatarUrl: null }],
      byId: { 1: { id: 1, nickname: 'User', avatarUrl: null } },
      missingIds: [],
    })).not.toThrow();
    expect(() => assertContentReplay({ requestId: 'replay-1', objectKey: 'replays/1.webm', contentVideoId: '1' })).not.toThrow();
  });

  it('detects incompatible breaking shapes', () => {
    expect(() => assertApiResponse({ status: 'ok' })).toThrow('incompatible internal contract');
    expect(() => assertIdentityBatchSummary({ items: [{ id: '1' }] })).toThrow('incompatible internal contract');
    expect(() => assertContentReplay({ requestId: 'replay-1', objectKey: 'replays/1.webm' })).toThrow('incompatible internal contract');
  });
});
