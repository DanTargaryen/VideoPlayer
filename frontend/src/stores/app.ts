import { computed, ref } from 'vue';
import { defineStore } from 'pinia';

import type { FrontendRole } from '@/types/auth';

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

  function logout() {
    token.value = '';
    userId.value = 0;
    role.value = 'guest';
    nickname.value = '游客';
    avatarUrl.value = '';
    email.value = '';
    unreadNotificationCount.value = 0;
    unreadDirectMessageCount.value = 0;
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
    adminAccessGranted,
    isLoggedIn,
    isAdmin,
    setAuth,
    setUnreadNotificationCount,
    setUnreadDirectMessageCount,
    logout,
    grantAdminAccess,
    revokeAdminAccess,
  };
});
