import axios from 'axios';
import { ElMessage } from 'element-plus';

import router from '@/router';
import { useAppStore } from '@/stores/app';
import pinia from '@/stores/pinia';

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api/v1',
  timeout: 10000,
});

let handlingSessionExpired = false;

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('vp_token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const requestUrl = String(error.config?.url ?? '');
    const store = useAppStore(pinia);
    const isAuthEntryRequest =
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/register') ||
      requestUrl.includes('/auth/reset-password');

    if (status === 401 && store.token && !isAuthEntryRequest && !handlingSessionExpired) {
      handlingSessionExpired = true;
      store.logout();
      ElMessage.warning('你的账号已在另一台设备登录，请重新登录。');
      if (router.currentRoute.value.path !== '/login') {
        await router.push('/login');
      }
      window.setTimeout(() => {
        handlingSessionExpired = false;
      }, 300);
    }

    return Promise.reject(error);
  },
);

export default http;
