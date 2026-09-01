import { beforeEach, describe, expect, it, vi } from 'vitest';

const { post } = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock('./http', () => ({ default: { post } }));

import { submitReview } from './platform';

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    clear() { values.clear(); },
    getItem(key) { return values.get(key) ?? null; },
    key(index) { return [...values.keys()][index] ?? null; },
    removeItem(key) { values.delete(key); },
    setItem(key, value) { values.set(key, value); },
  };
}

beforeEach(() => {
  vi.stubGlobal('localStorage', memoryStorage());
});

describe('review submission request identity', () => {
  it('reuses the same requestId after an uncertain failure and clears it after success', async () => {
    post
      .mockRejectedValueOnce(new Error('response lost'))
      .mockResolvedValueOnce({ data: { data: { videoId: 3, reviewId: 1, status: 'PENDING_REVIEW' } } });

    await expect(submitReview(3)).rejects.toThrow('response lost');
    await expect(submitReview(3)).resolves.toMatchObject({ reviewId: 1 });

    const firstRequestId = post.mock.calls[0]?.[2]?.headers?.['x-request-id'];
    const retriedRequestId = post.mock.calls[1]?.[2]?.headers?.['x-request-id'];
    expect(retriedRequestId).toBe(firstRequestId);
    expect(localStorage.getItem('vp_review_submission_request:3')).toBeNull();
  });

  it('discards the stored requestId after a definitive client error', async () => {
    post.mockRejectedValueOnce({ response: { status: 409 } });
    await expect(submitReview(9)).rejects.toMatchObject({ response: { status: 409 } });
    expect(localStorage.getItem('vp_review_submission_request:9')).toBeNull();
  });
});
