import { describe, expect, it } from 'vitest';

import { isRecoverableUploadSubmissionError, isTimeoutLikeApiError, resolveApiErrorMessage } from './apiErrors';

describe('API error normalization', () => {
  it('prefers a string response message', () => expect(resolveApiErrorMessage({ response: { data: { message: 'bad input' } } }, 'fallback')).toBe('bad input'));
  it('joins validation messages', () => expect(resolveApiErrorMessage({ response: { data: { message: ['a', 'b'] } } }, 'fallback')).toBe('a, b'));
  it('uses Error messages', () => expect(resolveApiErrorMessage(new Error('offline'), 'fallback')).toBe('offline'));
  it('uses fallback for empty errors', () => expect(resolveApiErrorMessage({}, 'fallback')).toBe('fallback'));
  it('uses fallback for blank response messages', () => expect(resolveApiErrorMessage({ response: { data: { message: '  ' } } }, 'fallback')).toBe('fallback'));
  it('recognizes ECONNABORTED', () => expect(isTimeoutLikeApiError({ code: 'ECONNABORTED' })).toBe(true));
  it('recognizes ETIMEDOUT', () => expect(isTimeoutLikeApiError({ code: 'ETIMEDOUT' })).toBe(true));
  it('recognizes HTTP 408', () => expect(isTimeoutLikeApiError({ response: { status: 408 } })).toBe(true));
  it('recognizes HTTP 504', () => expect(isTimeoutLikeApiError({ response: { status: 504 } })).toBe(true));
  it('recognizes timeout text in message', () => expect(isTimeoutLikeApiError({ message: 'Request timeout' })).toBe(true));
  it('recognizes timed out response text', () => expect(isTimeoutLikeApiError({ response: { data: { message: 'timed out' } } })).toBe(true));
  it('does not classify ordinary errors as timeout', () => expect(isTimeoutLikeApiError({ message: 'invalid token' })).toBe(false));
  it('allows timeout upload retries', () => expect(isRecoverableUploadSubmissionError({ code: 'ETIMEDOUT' })).toBe(true));
  it('allows gateway upload retries', () => expect(isRecoverableUploadSubmissionError({ response: { status: 502 } })).toBe(true));
  it('allows service unavailable upload retries', () => expect(isRecoverableUploadSubmissionError({ response: { status: 503 } })).toBe(true));
  it('rejects validation upload failures', () => expect(isRecoverableUploadSubmissionError({ response: { status: 422 } })).toBe(false));
});
