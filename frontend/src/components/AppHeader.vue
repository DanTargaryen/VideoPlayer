<template>
  <header class="header">
    <div class="header-bg">
      <img src="/assets/nav-bg.jpg" alt="" class="header-bg-img" />
      <div class="header-bg-overlay"></div>
    </div>

    <RouterLink to="/" class="brand-wrap">
      <span class="brand-mark">G</span>
      <div>
        <div class="brand">{{ siteName }}</div>
        <p class="subtitle">视频、直播与创作者社区</p>
      </div>
    </RouterLink>

    <nav class="nav">
      <RouterLink
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        class="nav-link"
        :class="{ active: isNavActive(item) }"
      >
        {{ item.label }}
      </RouterLink>
    </nav>

    <div class="search-box">
      <SearchSuggestBox v-model="searchKeyword" @search="submitSearch" />
    </div>

    <div class="actions">
      <template v-if="isLoggedIn">
        <RouterLink to="/following" class="action-icon-link" aria-label="关注动态">
          <el-icon :size="20"><Promotion /></el-icon>
          <span class="action-label">动态</span>
        </RouterLink>
        <RouterLink to="/notifications" class="action-icon-link" aria-label="消息通知">
          <el-icon :size="20"><Message /></el-icon>
          <span class="action-label">消息</span>
          <span v-if="unreadNotificationCount > 0" class="badge">{{ unreadNotificationCount }}</span>
        </RouterLink>
        <RouterLink to="/upload" class="action-icon-link" aria-label="上传投稿">
          <el-icon :size="20"><Upload /></el-icon>
          <span class="action-label">投稿</span>
        </RouterLink>
        <RouterLink v-if="isAdmin" to="/admin/dashboard" class="action-icon-link" aria-label="审核后台">
          <el-icon :size="20"><DocumentChecked /></el-icon>
          <span class="action-label">审核</span>
        </RouterLink>
        <RouterLink to="/user/dashboard" class="avatar-link" aria-label="用户中心">
          <img v-if="avatarUrl" :src="avatarUrl" alt="avatar" class="header-avatar" />
          <el-icon v-else :size="24"><User /></el-icon>
        </RouterLink>
      </template>
      <RouterLink v-else to="/login" class="login-btn">登录</RouterLink>
    </div>
  </header>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useRoute, useRouter } from 'vue-router';
import { DocumentChecked, Upload, Promotion, Message, User } from '@element-plus/icons-vue';

import SearchSuggestBox from '@/components/SearchSuggestBox.vue';
import { fetchUnreadNotificationCount, fetchCurrentUser } from '@/api/platform';
import { useAppStore } from '@/stores/app';
import { primaryNavItems as navItems } from '@/utils/navigation';

const store = useAppStore();
const router = useRouter();
const route = useRoute();
const { siteName, avatarUrl, isLoggedIn, isAdmin, token, unreadNotificationCount } = storeToRefs(store);
const searchKeyword = ref(String(route.query.keyword ?? ''));
let headerSyncTimer: number | null = null;

function isNavActive(item: { path: string }) {
  if (item.path === '/') {
    return route.path === '/' && !route.query.category;
  }
  if (item.path === '/live') {
    return route.path === '/live';
  }
  const url = new URL(item.path, window.location.origin);
  const itemCategory = url.searchParams.get('category');
  return route.path === url.pathname && route.query.category === itemCategory;
}

async function syncUnreadCount() {
  if (!isLoggedIn.value) {
    store.setUnreadNotificationCount(0);
    return;
  }

  try {
    const result = await fetchUnreadNotificationCount();
    store.setUnreadNotificationCount(result.unreadCount);
  } catch {
    store.setUnreadNotificationCount(0);
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
  position: sticky;
  top: 0;
  z-index: 30;
  display: grid;
  grid-template-columns: auto auto minmax(300px, 1fr) auto;
  align-items: center;
  gap: 18px;
  padding: 14px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  overflow: visible;
}

.header-bg {
  position: absolute;
  inset: 0;
  z-index: -1;
}

.header-bg-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}

.header-bg-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.15), rgba(0, 0, 0, 0.3));
}

.brand-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #ffffff;
  text-decoration: none;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
}

.brand-mark {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 14px;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: #fff;
  font-size: 20px;
  font-weight: 800;
}

.brand {
  font-size: 18px;
  font-weight: 800;
  letter-spacing: 0.02em;
}

.subtitle {
  margin: 2px 0 0;
  color: rgba(255, 255, 255, 0.85);
  font-size: 12px;
}

.nav {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.nav-link,
.login-btn,
.live-entry {
  transition: all 0.2s ease;
}

.nav-link {
  padding: 8px 16px;
  border-radius: 999px;
  color: rgba(255, 255, 255, 0.9);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
}

.nav-link:hover,
.nav-link.active {
  background: rgba(255, 255, 255, 0.2);
  color: #ffffff;
}

.search-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: 500px;
  margin: 0 auto;
}

.actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  flex-wrap: wrap;
}

.login-btn {
  padding: 10px 16px;
  border-radius: 999px;
  text-decoration: none;
}

.login-btn {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.4);
  color: #fff;
}

.action-icon-link {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.9);
  text-decoration: none;
  font-size: 12px;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
  transition: all 0.2s ease;
}

.action-icon-link:hover {
  background: rgba(255, 255, 255, 0.2);
  color: #ffffff;
}

.action-label {
  font-size: 11px;
  font-weight: 500;
}

.badge {
  margin-left: 6px;
  padding: 2px 8px;
  border-radius: 999px;
  background: #ffffff;
  color: #2563eb;
  font-size: 12px;
  font-weight: 600;
}

.avatar-link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  transition: all 0.2s ease;
}

.avatar-link:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.05);
}

.header-avatar {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

@media (max-width: 1200px) {
  .header {
    grid-template-columns: 1fr;
  }

  .search-box,
  .actions {
    justify-content: flex-start;
  }
}
</style>
