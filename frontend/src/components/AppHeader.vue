<template>
  <header class="header">
    <div class="brand-wrap">
      <div class="brand">{{ siteName }}</div>
      <span class="subtitle">在线视频与直播社区</span>
    </div>

    <div class="search-box">
      <el-input
        v-model="searchKeyword"
        placeholder="搜索视频或用户"
        clearable
        @keyup.enter="submitSearch"
      />
      <el-button type="primary" @click="submitSearch">搜索</el-button>
    </div>

    <nav class="nav">
      <RouterLink v-for="item in navItems" :key="item.path" :to="item.path" class="nav-link">
        {{ item.label }}
      </RouterLink>
    </nav>

    <div class="actions">
      <span class="nickname">{{ nickname }}</span>
      <RouterLink to="/following" class="action-link">关注流</RouterLink>
      <RouterLink to="/notifications" class="action-link">
        通知
        <span v-if="unreadCount > 0" class="badge">{{ unreadCount }}</span>
      </RouterLink>
      <RouterLink to="/user/dashboard" class="action-link">用户中心</RouterLink>
      <RouterLink to="/admin/dashboard" class="action-link">审核后台</RouterLink>
      <RouterLink v-if="!isLoggedIn" to="/login" class="action-link">登录</RouterLink>
      <button v-else class="ghost-btn" @click="logout">退出</button>
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
const { siteName, nickname, isLoggedIn, token } = storeToRefs(store);
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
  z-index: 10;
  display: grid;
  grid-template-columns: auto minmax(260px, 420px) 1fr auto;
  align-items: center;
  gap: 20px;
  padding: 16px 24px;
  background: rgba(15, 23, 42, 0.92);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(148, 163, 184, 0.18);
}

.brand-wrap {
  display: grid;
}

.brand {
  font-size: 20px;
  font-weight: 700;
}

.subtitle {
  color: #94a3b8;
  font-size: 12px;
}

.search-box {
  display: flex;
  gap: 10px;
}

.nav,
.actions {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.nav {
  justify-content: center;
}

.nickname {
  color: #94a3b8;
}

.nav-link,
.action-link,
.ghost-btn {
  color: #cbd5e1;
  background: transparent;
  border: 0;
  cursor: pointer;
}

.nav-link:hover,
.action-link:hover,
.ghost-btn:hover {
  color: #ffffff;
}

.badge {
  margin-left: 6px;
  padding: 2px 8px;
  border-radius: 999px;
  background: #ef4444;
  color: #fff;
  font-size: 12px;
}
</style>
