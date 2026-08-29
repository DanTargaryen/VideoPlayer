import type { ApiResponse, IdentityBatchSummaryContract } from './contracts.js';

export const INTERNAL_CONTRACT_VERSION = '1.0.0';

export const INTERNAL_CONTRACTS = Object.freeze({
  identityBatchSummary: 'POST /internal/v1/users/batch-summary',
  identityNotification: 'POST /internal/v1/notifications',
  contentReviewDecision: 'POST /internal/v1/videos/:id/review-decision',
  contentTextStatus: 'POST /internal/v1/videos/:id/text-status',
  contentReplayRegistration: 'POST /internal/v1/replays',
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function assertApiResponse(value: unknown): asserts value is ApiResponse<unknown> {
  if (!isRecord(value)
    || typeof value.code !== 'number'
    || typeof value.message !== 'string'
    || typeof value.requestId !== 'string'
    || !Object.hasOwn(value, 'data')) {
    throw new Error(`incompatible internal contract ${INTERNAL_CONTRACT_VERSION}: invalid API response envelope`);
  }
}

export function assertIdentityBatchSummary(value: unknown): asserts value is IdentityBatchSummaryContract {
  if (!isRecord(value)
    || !Array.isArray(value.requestedIds)
    || !Array.isArray(value.items)
    || !Array.isArray(value.missingIds)
    || !isRecord(value.byId)
    || !value.items.every((item) => isRecord(item)
      && Number.isInteger(item.id)
      && typeof item.nickname === 'string'
      && (item.avatarUrl === null || typeof item.avatarUrl === 'string'))) {
    throw new Error(`incompatible internal contract ${INTERNAL_CONTRACT_VERSION}: invalid identity batch summary`);
  }
}

export function assertContentReplay(value: unknown): asserts value is {
  requestId: string;
  objectKey: string;
  contentVideoId: string;
} {
  if (!isRecord(value)
    || typeof value.requestId !== 'string'
    || typeof value.objectKey !== 'string'
    || typeof value.contentVideoId !== 'string') {
    throw new Error(`incompatible internal contract ${INTERNAL_CONTRACT_VERSION}: invalid replay registration`);
  }
}
