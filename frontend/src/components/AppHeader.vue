<template>
  <header class="header">
    <RouterLink to="/" class="brand-wrap">
      <img src="/assets/guanlan-brand-logo.jpg" alt="观澜视频" class="brand-mark" />
      <div class="brand-copy">
        <div class="brand">{{ siteName }}</div>
        <p class="subtitle">发现 · 创作 · 分享</p>
      </div>
    </RouterLink>

    <nav class="nav">
      <RouterLink
        v-for="item in headerNavItems"
        :key="item.path"
        :to="item.path"
        class="nav-link"
        :class="{ active: isNavActive(item) }"
      >
        <span>{{ item.label }}</span>
      </RouterLink>
    </nav>

    <div class="search-box">
      <SearchSuggestBox v-model="searchKeyword" placeholder="搜索视频、UP主或内容" @search="submitSearch" />
    </div>

    <div class="actions">
      <RouterLink :to="isLoggedIn ? '/upload' : '/login'" class="action-icon-link" aria-label="上传">
        <el-icon :size="22"><Upload /></el-icon>
        <span class="action-label">上传</span>
      </RouterLink>
      <RouterLink :to="isLoggedIn ? '/messages' : '/login'" class="action-icon-link" aria-label="消息">
        <span class="action-icon-stack">
          <el-icon :size="22"><Message /></el-icon>
          <span v-if="isLoggedIn && messageBadgeCount > 0" class="badge">{{ messageBadgeCount }}</span>
        </span>
        <span class="action-label">消息</span>
      </RouterLink>
      <RouterLink :to="isLoggedIn ? '/user/dashboard' : '/login'" class="action-icon-link" aria-label="收藏">
        <el-icon :size="22"><Star /></el-icon>
        <span class="action-label">收藏</span>
      </RouterLink>
      <template v-if="isLoggedIn">
        <RouterLink v-if="isAdmin" to="/admin/dashboard" class="action-icon-link" aria-label="审核后台">
          <el-icon :size="22"><DocumentChecked /></el-icon>
          <span class="action-label">审核</span>
        </RouterLink>
        <RouterLink to="/user/dashboard" class="avatar-link" aria-label="用户中心">
          <img v-if="avatarUrl" :src="avatarUrl" alt="avatar" class="header-avatar" />
          <el-icon v-else :size="22"><User /></el-icon>
          <el-icon :size="13" class="avatar-arrow"><ArrowDown /></el-icon>
        </RouterLink>
      </template>
      <RouterLink v-else to="/login" class="login-btn">登录</RouterLink>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useRoute, useRouter } from 'vue-router';
import {
  ArrowDown,
  DocumentChecked,
  Message,
  Star,
  Upload,
  User,
} from '@element-plus/icons-vue';

import SearchSuggestBox from '@/components/SearchSuggestBox.vue';
import { fetchCurrentUser, fetchUnreadDirectMessageCount, fetchUnreadNotificationCount } from '@/api/platform';
import { useAppStore } from '@/stores/app';

interface HeaderNavItem {
  label: string;
  path: string;
  activeQuery?: {
    key: string;
    value: string;
  };
}

const headerNavItems: HeaderNavItem[] = [
  { label: '推荐', path: '/' },
  { label: '关注', path: '/following' },
  { label: '探索', path: '/search?tab=video' },
  { label: '直播', path: '/live' },
  { label: '动态', path: '/notifications' },
];

const store = useAppStore();
const router = useRouter();
const route = useRoute();
const { siteName, avatarUrl, isLoggedIn, isAdmin, token, unreadNotificationCount, unreadDirectMessageCount } = storeToRefs(store);
const searchKeyword = ref(String(route.query.keyword ?? ''));
const messageBadgeCount = computed(() => unreadNotificationCount.value + unreadDirectMessageCount.value);
let headerSyncTimer: number | null = null;

function isNavActive(item: HeaderNavItem) {
  if (item.path === '/') {
    return route.path === '/' && !route.query.category;
  }

  if (item.path === '/live') {
    return route.path.startsWith('/live');
  }

  const url = new URL(item.path, window.location.origin);
  if (item.path.startsWith('/search')) {
    return route.path === url.pathname;
  }

  const itemCategory = url.searchParams.get('category');

  if (item.activeQuery) {
    return route.path === url.pathname && route.query[item.activeQuery.key] === item.activeQuery.value;
  }

  if (!itemCategory) {
    return route.path === url.pathname;
  }

  return route.path === url.pathname && route.query.category === itemCategory;
}

async function syncUnreadCount() {
  if (!isLoggedIn.value) {
    store.setUnreadNotificationCount(0);
    store.setUnreadDirectMessageCount(0);
    return;
  }

  try {
    const [notificationResult, directMessageResult] = await Promise.all([
      fetchUnreadNotificationCount(),
      fetchUnreadDirectMessageCount(),
    ]);
    store.setUnreadNotificationCount(notificationResult.unreadCount);
    store.setUnreadDirectMessageCount(directMessageResult.unreadCount);
  } catch {
    store.setUnreadNotificationCount(0);
    store.setUnreadDirectMessageCount(0);
  }
}

async function syncAvatar() {
  if (!isLoggedIn.value) {
    return;
  }

  try {
    const user = await fetchCurrentUser();
    const backendRole = user.role === 'ADMIN' ? 'ADMIN' : 'USER';
    store.setAuth({
      token: store.token,
      userId: store.userId,
      role: backendRole,
      nickname: store.nickname,
      avatarUrl: user.avatarUrl ?? '',
      email: user.email,
    });
  } catch {
    // Keep the existing avatar if the lightweight header refresh fails.
  }
}

function submitSearch(keyword?: string) {
  const normalizedKeyword = (keyword ?? searchKeyword.value).trim();
  router.push({
    path: '/search',
    query: {
      keyword: normalizedKeyword,
      tab: 'video',
    },
  });
}

watch(token, () => {
  void syncUnreadCount();
  void syncAvatar();
  if (token.value) {
    startHeaderSync();
    return;
  }

  stopHeaderSync();
});

watch(
  () => route.query.keyword,
  (value) => {
    searchKeyword.value = String(value ?? '');
  },
);

onMounted(() => {
  void syncUnreadCount();
  void syncAvatar();
  if (token.value) {
    startHeaderSync();
  }
});

onUnmounted(() => {
  stopHeaderSync();
});

function stopHeaderSync() {
  if (headerSyncTimer) {
    window.clearInterval(headerSyncTimer);
    headerSyncTimer = null;
  }
}

function startHeaderSync() {
  stopHeaderSync();
  headerSyncTimer = window.setInterval(() => {
    void syncUnreadCount();
    void syncAvatar();
  }, 3000);
}
</script>

<style scoped>
.header {
  --header-blue: var(--color-primary);
  --header-soft-blue: var(--color-primary-light);
  --header-border: var(--color-border-soft);
  position: sticky;
  top: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  gap: clamp(22px, 2.4vw, 34px);
  height: 64px;
  min-height: 64px;
  padding: 0 clamp(24px, 3vw, 40px);
  background: var(--color-bg-card);
  border-bottom: 1px solid var(--header-border);
  box-shadow: 0 1px 12px rgba(15, 23, 42, 0.025);
  overflow: visible;
}

.brand-wrap {
  display: flex;
  align-items: center;
  flex: 0 0 188px;
  gap: 9px;
  color: var(--color-text-main);
  text-decoration: none;
  text-shadow: none;
}

.brand-copy {
  display: grid;
  gap: 1px;
  min-width: 0;
}

.brand-mark {
  width: 32px;
  height: 32px;
  object-fit: contain;
  object-position: center;
  padding: 0;
  border-radius: 9px;
  background: transparent;
  box-shadow: none;
  flex-shrink: 0;
  box-sizing: border-box;
}

.brand {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 0;
  line-height: 1.08;
  white-space: nowrap;
}

.subtitle {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 12px;
  font-weight: 500;
  line-height: 1.15;
  white-space: nowrap;
}

.nav {
  display: flex;
  align-items: center;
  flex: 0 1 auto;
  gap: clamp(34px, 2.8vw, 40px);
  min-width: 0;
  white-space: nowrap;
}

.nav-link,
.login-btn,
.live-entry {
  transition: all 0.2s ease;
}

.nav-link {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: auto;
  height: 64px;
  padding: 0;
  border-radius: 0;
  border: 0;
  color: var(--color-text-main);
  text-decoration: none;
  font-size: 15px;
  font-weight: 600;
  line-height: 1;
  text-shadow: none;
}

.nav-link::after {
  content: "";
  position: absolute;
  left: 50%;
  bottom: 9px;
  width: 0;
  height: 2px;
  border-radius: 999px;
  background: var(--header-blue);
  transform: translateX(-50%);
  transition: width 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}

.nav-link:hover,
.nav-link.active {
  color: var(--header-blue);
  background: transparent;
  border-color: transparent;
  box-shadow: none;
  text-shadow: none;
}

.nav-link.active::after {
  width: 28px;
}

.search-box {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1 1 500px;
  width: 100%;
  min-width: 320px;
  max-width: 500px;
  margin-left: auto;
}

.search-box :deep(.search-input-container) {
  max-width: 100%;
  height: 40px;
  border-radius: 999px;
  background: var(--color-bg-page);
  border: 1px solid var(--color-border-soft);
  box-shadow: inset 0 1px 1px rgba(15, 23, 42, 0.025);
}

.search-box :deep(.search-input-container:focus-within) {
  background: var(--color-bg-card);
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}

.search-box :deep(.search-input) {
  padding: 0 48px 0 22px;
  color: var(--color-text-main);
  font-size: 14px;
  font-weight: 500;
}

.search-box :deep(.search-input::placeholder) {
  color: var(--color-text-muted);
  font-weight: 500;
}

.search-box :deep(.search-icon-btn) {
  right: 15px;
  color: var(--color-text-secondary);
}

.search-box :deep(.search-icon-btn:hover) {
  color: var(--header-blue);
}

.search-box :deep(.clear-btn) {
  right: 44px;
  color: var(--color-text-muted);
}

.search-box :deep(.clear-btn:hover) {
  color: var(--color-text-secondary);
}

.search-box :deep(.suggest-panel) {
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.98);
  border-color: var(--color-border-soft);
  box-shadow: 0 18px 42px rgba(15, 23, 42, 0.14);
}

.search-box :deep(.suggest-item) {
  color: var(--color-text-main);
}

.search-box :deep(.suggest-item:hover),
.search-box :deep(.suggest-item.active) {
  background: var(--color-primary-light);
  color: var(--header-blue);
}

.actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex: 0 0 auto;
  gap: 22px;
  white-space: nowrap;
}

.login-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 78px;
  height: 38px;
  padding: 0 18px;
  border-radius: 999px;
  text-decoration: none;
  background: var(--header-soft-blue);
  border: 1px solid var(--color-primary-soft);
  color: var(--header-blue);
  font-weight: 700;
}

.login-btn:hover {
  background: var(--color-primary-soft);
}

.action-icon-link {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  width: 36px;
  height: 48px;
  padding: 0;
  border-radius: 10px;
  color: #334155;
  text-decoration: none;
  font-size: 12px;
  text-shadow: none;
  transition: all 0.2s ease;
}

.action-icon-link:hover {
  background: var(--color-primary-light);
  color: var(--header-blue);
}

.action-label {
  font-size: 12px;
  font-weight: 500;
  line-height: 1;
}

.action-icon-stack {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.badge {
  position: absolute;
  top: -9px;
  right: -11px;
  min-width: 16px;
  height: 16px;
  padding: 0 5px;
  border-radius: 999px;
  background: var(--color-danger);
  color: #FFFFFF;
  font-size: 10px;
  font-weight: 800;
  line-height: 16px;
  text-align: center;
  box-shadow: 0 0 0 2px var(--color-bg-card);
}

.avatar-link {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: auto;
  height: 48px;
  padding-left: 0;
  border-radius: 12px;
  overflow: visible;
  background: transparent;
  color: var(--color-text-secondary);
  transition: all 0.2s ease;
}

.avatar-link:hover {
  color: var(--header-blue);
}

.header-avatar {
  width: 36px;
  height: 36px;
  object-fit: cover;
  border-radius: 50%;
  box-shadow: 0 3px 10px rgba(15, 23, 42, 0.1);
}

.avatar-arrow {
  color: var(--color-text-muted);
}

@media (max-width: 1320px) {
  .header {
    gap: 20px;
    padding: 0 24px;
  }

  .brand-wrap {
    flex-basis: 174px;
  }

  .nav {
    gap: 28px;
  }

  .nav-link {
    font-size: 14px;
  }

  .search-box {
    min-width: 280px;
    max-width: 450px;
  }

  .actions {
    gap: 16px;
  }

  .action-icon-link {
    width: 34px;
  }
}

@media (max-width: 1080px) {
  .header {
    flex-wrap: wrap;
    min-height: auto;
    height: auto;
    padding: 12px 24px;
    row-gap: 10px;
  }

  .brand-wrap {
    flex: 1 1 220px;
  }

  .search-box {
    order: 3;
    flex: 1 1 100%;
    max-width: none;
    min-width: 0;
    margin-left: 0;
  }

  .nav {
    order: 4;
    width: 100%;
    overflow-x: auto;
    padding-bottom: 2px;
  }

  .nav-link {
    height: 34px;
  }

  .nav-link::after {
    bottom: 0;
  }
}

@media (max-width: 680px) {
  .header {
    padding: 10px 16px;
  }

  .brand-wrap {
    flex-basis: auto;
    gap: 8px;
  }

  .brand-mark {
    width: 32px;
    height: 32px;
  }

  .brand {
    font-size: 17px;
  }

  .subtitle {
    font-size: 11px;
  }

  .actions {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
