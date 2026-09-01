import { describe, expect, it, vi } from 'vitest';

import { MEDIA_PLAYBACK_ERROR_MESSAGE, useMediaPlaybackRecovery } from './mediaPlaybackRecovery';

describe('media playback recovery', () => {
  it('exposes a user-visible message after the media element fails', () => {
    const recovery = useMediaPlaybackRecovery();

    recovery.markMediaPlaybackFailed();

    expect(recovery.mediaPlaybackError.value).toBe(MEDIA_PLAYBACK_ERROR_MESSAGE);
  });

  it('clears the error once media metadata loads', () => {
    const recovery = useMediaPlaybackRecovery();
    recovery.markMediaPlaybackFailed();

    recovery.markMediaPlaybackReady();

    expect(recovery.mediaPlaybackError.value).toBe('');
  });

  it('clears the error and reloads the media element when retrying', () => {
    const recovery = useMediaPlaybackRecovery();
    const player = { load: vi.fn() };
    recovery.markMediaPlaybackFailed();

    expect(recovery.retryMediaPlayback(player)).toBe(true);
    expect(recovery.mediaPlaybackError.value).toBe('');
    expect(player.load).toHaveBeenCalledOnce();
  });

  it('keeps the error when no media element is available to retry', () => {
    const recovery = useMediaPlaybackRecovery();
    recovery.markMediaPlaybackFailed();

    expect(recovery.retryMediaPlayback(null)).toBe(false);
    expect(recovery.mediaPlaybackError.value).toBe(MEDIA_PLAYBACK_ERROR_MESSAGE);
  });
});
