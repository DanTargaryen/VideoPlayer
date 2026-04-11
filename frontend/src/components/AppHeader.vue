<template>
  <header class="header">
    <RouterLink to="/" class="brand-wrap">
      <span class="brand-mark">G</span>
      <div>
        <div class="brand">{{ siteName }}</div>
        <p class="subtitle">视频、直播与创作者社区</p>
      </div>
    </RouterLink>

    <nav class="nav">
      <RouterLink v-for="item in navItems" :key="item.path" :to="item.path" class="nav-link">
        {{ item.label }}
      </RouterLink>
    </nav>

    <div class="search-box">
      <el-input
        v-model="searchKeyword"
        placeholder="搜索视频、直播或创作者"
        clearable
        @keyup.enter="submitSearch"
      />
      <el-button type="primary" @click="submitSearch">搜索</el-button>
    </div>

    <div class="actions">
      <RouterLink to="/live" class="live-entry">直播</RouterLink>
      <template v-if="isLoggedIn">
        <span class="nickname">{{ nickname }}</span>
        <RouterLink to="/following" class="action-link">关注</RouterLink>
        <RouterLink to="/notifications" class="action-link">
          通知
          <span v-if="unreadCount > 0" class="badge">{{ unreadCount }}</span>
        </RouterLink>
        <RouterLink to="/user/dashboard" class="action-link">创作中心</RouterLink>
        <RouterLink v-if="isAdmin" to="/admin/dashboard" class="action-link">审核后台</RouterLink>
        <button class="ghost-btn" @click="logout">退出</button>
      </template>
      <RouterLink v-else to="/login" class="login-btn">登录</RouterLink>
    </div>
  </header>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useRoute, useRouter } from 'vue-router';

import { fetchUnreadNotificationCount } from '@/api/platform';
import { useAppStore } from '@/stores/app';
import { primaryNavItems as navItems } from '@/utils/navigation';

const store = useAppStore();
const router = useRouter();
const route = useRoute();
const { siteName, nickname, isLoggedIn, isAdmin, token } = storeToRefs(store);
const unreadCount = ref(0);
const searchKeyword = ref(String(route.query.keyword ?? ''));

async function syncUnreadCount() {
  if (!isLoggedIn.value) {
    unreadCount.value = 0;
    return;
  }

  try {
    const result = await fetchUnreadNotificationCount();
    unreadCount.value = result.unreadCount;
  } catch {
    unreadCount.value = 0;
  }
}

function submitSearch() {
  router.push({
    path: '/search',
    query: {
      keyword: searchKeyword.value,
      tab: 'video',
    },
  });
}

function logout() {
  store.logout();
  unreadCount.value = 0;
  router.push('/');
}

watch(token, () => {
  void syncUnreadCount();
});

watch(
  () => route.query.keyword,
  (value) => {
    searchKeyword.value = String(value ?? '');
  },
);

onMounted(() => {
  void syncUnreadCount();
});
</script>

<style scoped>
.header {
  position: sticky;
  top: 0;
  z-index: 30;
  display: grid;
  grid-template-columns: auto minmax(320px, 1fr) minmax(300px, 420px) auto;
  align-items: center;
  gap: 18px;
  padding: 14px 24px;
  background: rgba(250, 251, 255, 0.88);
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(20px);
}

.brand-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #111827;
  text-decoration: none;
}

.brand-mark {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 14px;
  background: linear-gradient(135deg, #fb7185, #f97316);
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
  color: #6b7280;
  font-size: 12px;
}

.nav {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.nav-link,
.action-link,
.ghost-btn,
.login-btn,
.live-entry {
  transition: all 0.2s ease;
}

.nav-link {
  padding: 8px 14px;
  border-radius: 999px;
  color: #374151;
  text-decoration: none;
}

.nav-link:hover,
.nav-link.router-link-active {
  background: rgba(248, 113, 113, 0.12);
  color: #e11d48;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 10px;
}

.actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  flex-wrap: wrap;
}

.live-entry,
.login-btn {
  padding: 10px 16px;
  border-radius: 999px;
  text-decoration: none;
}

.live-entry {
  background: linear-gradient(135deg, #fb7185, #ef4444);
  color: #fff;
  box-shadow: 0 10px 24px rgba(239, 68, 68, 0.22);
}

.login-btn {
  background: #111827;
  color: #fff;
}

.nickname {
  color: #111827;
  font-weight: 700;
}

.action-link,
.ghost-btn {
  color: #4b5563;
  text-decoration: none;
  background: transparent;
  border: 0;
  cursor: pointer;
}

.action-link:hover,
.ghost-btn:hover {
  color: #111827;
}

.badge {
  margin-left: 6px;
  padding: 2px 8px;
  border-radius: 999px;
  background: #ef4444;
  color: #fff;
  font-size: 12px;
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
