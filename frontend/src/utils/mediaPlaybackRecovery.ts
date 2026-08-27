import { ref } from 'vue';

export const MEDIA_PLAYBACK_ERROR_MESSAGE = '视频加载失败，媒体暂不可用，请稍后重试。';

export function useMediaPlaybackRecovery() {
  const mediaPlaybackError = ref('');

  function markMediaPlaybackFailed() {
    mediaPlaybackError.value = MEDIA_PLAYBACK_ERROR_MESSAGE;
  }

  function markMediaPlaybackReady() {
    mediaPlaybackError.value = '';
  }

  function retryMediaPlayback(player: Pick<HTMLMediaElement, 'load'> | null) {
    if (!player) {
      return false;
    }

    markMediaPlaybackReady();
    player.load();
    return true;
  }

  return {
    mediaPlaybackError,
    markMediaPlaybackFailed,
    markMediaPlaybackReady,
    retryMediaPlayback,
  };
}
