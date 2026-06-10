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
const MEDIA_PROXY_PATH = '/api/v1/media-proxy';

function shouldProxyMediaUrl(value: string) {
  if (typeof window === 'undefined' || window.location.protocol !== 'https:') {
    return false;
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }

  if (parsed.protocol !== 'http:') {
    return false;
  }

  return parsed.port === '9000' || parsed.hostname === '182.92.132.80';
}

function rewriteMediaUrl(value: string) {
  if (!shouldProxyMediaUrl(value)) {
    return value;
  }

  return `${MEDIA_PROXY_PATH}?url=${encodeURIComponent(value)}`;
}

function rewriteMediaUrls<T>(payload: T, seen = new WeakSet<object>()): T {
  if (typeof payload === 'string') {
    return rewriteMediaUrl(payload) as T;
  }

  if (!payload || typeof payload !== 'object') {
    return payload;
  }

  if (payload instanceof Blob || payload instanceof File || payload instanceof Date) {
    return payload;
  }

  if (seen.has(payload)) {
    return payload;
  }
  seen.add(payload);

  if (Array.isArray(payload)) {
    payload.forEach((item, index) => {
      payload[index] = rewriteMediaUrls(item, seen);
    });
    return payload;
  }

  Object.entries(payload as Record<string, unknown>).forEach(([key, value]) => {
    (payload as Record<string, unknown>)[key] = rewriteMediaUrls(value, seen);
  });

  return payload;
}

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('vp_token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

http.interceptors.response.use(
  (response) => {
    response.data = rewriteMediaUrls(response.data);
    return response;
  },
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
      const currentPath = router.currentRoute.value.fullPath;
      store.logout();
      ElMessage.warning('登录已过期，请重新登录。');
      if (router.currentRoute.value.path !== '/login') {
        await router.push({ path: '/login', query: currentPath !== '/' ? { redirect: currentPath } : {} });
      }
      window.setTimeout(() => {
        handlingSessionExpired = false;
      }, 300);
    }

    if (status === 401 && !store.token && !isAuthEntryRequest) {
      const currentPath = router.currentRoute.value.fullPath;
      if (router.currentRoute.value.path !== '/login') {
        await router.push({ path: '/login', query: currentPath !== '/' ? { redirect: currentPath } : {} });
      }
    }

    return Promise.reject(error);
  },
);

export default http;
