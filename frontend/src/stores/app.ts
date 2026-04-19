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
  const phone = ref(localStorage.getItem('vp_phone') ?? '');
  const unreadNotificationCount = ref(0);
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
    phone?: string;
  }) {
    token.value = payload.token;
    userId.value = payload.userId;
    role.value = normalizeRole(payload.role);
    nickname.value = payload.nickname;
    avatarUrl.value = payload.avatarUrl ?? '';
    phone.value = payload.phone ?? '';

    localStorage.setItem('vp_token', payload.token);
    localStorage.setItem('vp_user_id', String(payload.userId));
    localStorage.setItem('vp_role', role.value);
    localStorage.setItem('vp_nickname', payload.nickname);
    if (payload.avatarUrl) {
      localStorage.setItem('vp_avatar', payload.avatarUrl);
    }
    if (payload.phone) {
      localStorage.setItem('vp_phone', payload.phone);
    }
  }

  function setUnreadNotificationCount(count: number) {
    unreadNotificationCount.value = Math.max(0, count);
  }

  function logout() {
    token.value = '';
    userId.value = 0;
    role.value = 'guest';
    nickname.value = '游客';
    avatarUrl.value = '';
    phone.value = '';
    unreadNotificationCount.value = 0;
    revokeAdminAccess();

    localStorage.removeItem('vp_token');
    localStorage.removeItem('vp_user_id');
    localStorage.removeItem('vp_role');
    localStorage.removeItem('vp_nickname');
    localStorage.removeItem('vp_avatar');
    localStorage.removeItem('vp_phone');
  }

  return {
    siteName,
    token,
    userId,
    role,
    nickname,
    avatarUrl,
    phone,
    unreadNotificationCount,
    adminAccessGranted,
    isLoggedIn,
    isAdmin,
    setAuth,
    setUnreadNotificationCount,
    logout,
    grantAdminAccess,
    revokeAdminAccess,
  };
});
