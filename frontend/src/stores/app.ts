import { computed, ref } from 'vue';
import { defineStore } from 'pinia';

import type { FrontendRole } from '@/types/auth';

export const useAppStore = defineStore('app', () => {
  const siteName = ref('观澜视频平台');
  const token = ref(localStorage.getItem('vp_token') ?? '');
  const userId = ref(Number(localStorage.getItem('vp_user_id') ?? 0));
  const role = ref<FrontendRole>((localStorage.getItem('vp_role') as FrontendRole) || 'guest');
  const nickname = ref(localStorage.getItem('vp_nickname') ?? '游客');

  const isLoggedIn = computed(() => Boolean(token.value));

  function normalizeRole(input: 'USER' | 'ADMIN'): FrontendRole {
    if (input === 'ADMIN') return 'admin';
    return 'user';
  }

  function setAuth(payload: {
    token: string;
    userId: number;
    role: 'USER' | 'ADMIN';
    nickname: string;
  }) {
    token.value = payload.token;
    userId.value = payload.userId;
    role.value = normalizeRole(payload.role);
    nickname.value = payload.nickname;

    localStorage.setItem('vp_token', payload.token);
    localStorage.setItem('vp_user_id', String(payload.userId));
    localStorage.setItem('vp_role', role.value);
    localStorage.setItem('vp_nickname', payload.nickname);
  }

  function logout() {
    token.value = '';
    userId.value = 0;
    role.value = 'guest';
    nickname.value = '游客';

    localStorage.removeItem('vp_token');
    localStorage.removeItem('vp_user_id');
    localStorage.removeItem('vp_role');
    localStorage.removeItem('vp_nickname');
  }

  return {
    siteName,
    token,
    userId,
    role,
    nickname,
    isLoggedIn,
    setAuth,
    logout,
  };
});
