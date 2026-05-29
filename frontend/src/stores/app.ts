import { computed, ref } from 'vue';
import { defineStore } from 'pinia';

import type { FrontendRole } from '@/types/auth';

const VIDEO_PLAYBACK_HISTORY_KEY = 'vp_video_playback_history';
const VIDEO_PLAYBACK_HISTORY_LIMIT = 50;

function canUseSessionStorage() {
  try {
    return typeof sessionStorage !== 'undefined';
  } catch {
    return false;
  }
}

function normalizeVideoId(input: unknown) {
  const id = Number(input);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function compactVideoPlaybackHistory(ids: number[]) {
  return ids.reduce<number[]>((history, id) => {
    if (history[history.length - 1] !== id) {
      history.push(id);
    }
    return history;
  }, []).slice(-VIDEO_PLAYBACK_HISTORY_LIMIT);
}

function readVideoPlaybackHistory() {
  if (!canUseSessionStorage()) {
    return [];
  }

  try {
    const parsed = JSON.parse(sessionStorage.getItem(VIDEO_PLAYBACK_HISTORY_KEY) ?? '[]') as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return compactVideoPlaybackHistory(
      parsed.map(normalizeVideoId).filter((id): id is number => typeof id === 'number'),
    );
  } catch {
    return [];
  }
}

export const useAppStore = defineStore('app', () => {
  const siteName = ref('观澜视频平台');
  const token = ref(localStorage.getItem('vp_token') ?? '');
  const userId = ref(Number(localStorage.getItem('vp_user_id') ?? 0));
  const role = ref<FrontendRole>((localStorage.getItem('vp_role') as FrontendRole) || 'guest');
  const nickname = ref(localStorage.getItem('vp_nickname') ?? '游客');
  const avatarUrl = ref(localStorage.getItem('vp_avatar') ?? '');
  const email = ref(localStorage.getItem('vp_email') ?? '');
  const unreadNotificationCount = ref(0);
  const unreadDirectMessageCount = ref(0);
  const videoPlaybackHistory = ref<number[]>(readVideoPlaybackHistory());
  const adminAccessGranted = ref(localStorage.getItem('vp_admin_access') === 'true');

  const isLoggedIn = computed(() => Boolean(token.value));
  const isAdmin = computed(() => role.value === 'admin');

  function normalizeRole(input: 'USER' | 'ADMIN'): FrontendRole {
    if (input === 'ADMIN') return 'admin';
    return 'user';
  }

  function grantAdminAccess() {
    adminAccessGranted.value = true;
    localStorage.setItem('vp_admin_access', 'true');
  }

  function revokeAdminAccess() {
    adminAccessGranted.value = false;
    localStorage.removeItem('vp_admin_access');
  }

  function setAuth(payload: {
    token: string;
    userId: number;
    role: 'USER' | 'ADMIN';
    nickname: string;
    avatarUrl?: string;
    email?: string;
  }) {
    token.value = payload.token;
    userId.value = payload.userId;
    role.value = normalizeRole(payload.role);
    nickname.value = payload.nickname;
    avatarUrl.value = payload.avatarUrl ?? avatarUrl.value;
    email.value = payload.email ?? email.value;

    localStorage.setItem('vp_token', payload.token);
    localStorage.setItem('vp_user_id', String(payload.userId));
    localStorage.setItem('vp_role', role.value);
    localStorage.setItem('vp_nickname', payload.nickname);
    localStorage.setItem('vp_avatar', avatarUrl.value);
    localStorage.setItem('vp_email', email.value);
  }

  function setUnreadNotificationCount(count: number) {
    unreadNotificationCount.value = Math.max(0, count);
  }

  function setUnreadDirectMessageCount(count: number) {
    unreadDirectMessageCount.value = Math.max(0, count);
  }

  function setVideoPlaybackHistory(history: number[]) {
    videoPlaybackHistory.value = compactVideoPlaybackHistory(history);
    if (canUseSessionStorage()) {
      sessionStorage.setItem(VIDEO_PLAYBACK_HISTORY_KEY, JSON.stringify(videoPlaybackHistory.value));
    }
  }

  function clearVideoPlaybackHistory() {
    videoPlaybackHistory.value = [];
    if (canUseSessionStorage()) {
      sessionStorage.removeItem(VIDEO_PLAYBACK_HISTORY_KEY);
    }
  }

  function recordVideoPlayback(videoId: number) {
    const normalizedVideoId = normalizeVideoId(videoId);

    if (!normalizedVideoId || videoPlaybackHistory.value[videoPlaybackHistory.value.length - 1] === normalizedVideoId) {
      return;
    }

    setVideoPlaybackHistory([...videoPlaybackHistory.value, normalizedVideoId]);
  }

  function getPreviousVideoId(currentVideoId: number) {
    const normalizedVideoId = normalizeVideoId(currentVideoId);

    if (!normalizedVideoId) {
      return null;
    }

    for (let index = videoPlaybackHistory.value.length - 1; index >= 0; index -= 1) {
      const candidate = videoPlaybackHistory.value[index];
      if (candidate !== normalizedVideoId) {
        return candidate;
      }
    }

    return null;
  }

  function takePreviousVideoId(currentVideoId: number) {
    const normalizedVideoId = normalizeVideoId(currentVideoId);

    if (!normalizedVideoId) {
      return null;
    }

    const nextHistory = [...videoPlaybackHistory.value];
    while (nextHistory.length > 0 && nextHistory[nextHistory.length - 1] === normalizedVideoId) {
      nextHistory.pop();
    }

    const previousVideoId = nextHistory[nextHistory.length - 1] ?? null;
    setVideoPlaybackHistory(previousVideoId ? nextHistory : [normalizedVideoId]);
    return previousVideoId;
  }

  function logout() {
    token.value = '';
    userId.value = 0;
    role.value = 'guest';
    nickname.value = '游客';
    avatarUrl.value = '';
    email.value = '';
    unreadNotificationCount.value = 0;
    unreadDirectMessageCount.value = 0;
    clearVideoPlaybackHistory();
    revokeAdminAccess();

    localStorage.removeItem('vp_token');
    localStorage.removeItem('vp_user_id');
    localStorage.removeItem('vp_role');
    localStorage.removeItem('vp_nickname');
    localStorage.removeItem('vp_avatar');
    localStorage.removeItem('vp_email');
  }

  return {
    siteName,
    token,
    userId,
    role,
    nickname,
    avatarUrl,
    email,
    unreadNotificationCount,
    unreadDirectMessageCount,
    videoPlaybackHistory,
    adminAccessGranted,
    isLoggedIn,
    isAdmin,
    setAuth,
    setUnreadNotificationCount,
    setUnreadDirectMessageCount,
    recordVideoPlayback,
    getPreviousVideoId,
    takePreviousVideoId,
    clearVideoPlaybackHistory,
    logout,
    grantAdminAccess,
    revokeAdminAccess,
  };
});
