<template>
  <section class="sidebar-card">
    <header class="sidebar-head">
      <h2>我关注的 UP 主</h2>
      <span>管理</span>
    </header>
    <div v-if="items.length > 0" class="user-list">
      <RouterLink v-for="item in items" :key="item.id" :to="`/users/${item.id}`" class="user-item">
        <img v-if="item.avatarUrl" :src="item.avatarUrl" :alt="item.nickname" />
        <span v-else class="avatar-fallback">{{ item.nickname.slice(0, 1) }}</span>
        <strong>{{ item.nickname }}</strong>
        <span class="followed">已关注</span>
      </RouterLink>
    </div>
    <p v-else class="sidebar-empty">还没有关注的 UP 主</p>
    <RouterLink v-if="items.length > 0" to="/user/dashboard" class="view-all">查看全部</RouterLink>
  </section>
</template>

<script setup lang="ts">
import type { FollowUserItem } from '@/types/api';

defineProps<{
  items: FollowUserItem[];
}>();
</script>

<style scoped>
.sidebar-card {
  display: grid;
  gap: 16px;
  padding: 20px;
  border: 1px solid var(--color-border);
  border-radius: 18px;
  background: var(--color-bg-card);
  box-shadow: var(--gl-shadow-card);
}

.sidebar-head,
.user-item,
.view-all {
  display: flex;
  align-items: center;
}

.sidebar-head {
  justify-content: space-between;
}

.sidebar-head h2 {
  margin: 0;
  color: var(--color-text-main);
  font-size: 18px;
}

.sidebar-head span {
  color: var(--color-text-secondary);
  font-size: 13px;
  font-weight: 800;
}

.user-list {
  display: grid;
  gap: 14px;
}

.user-item {
  gap: 10px;
}

.user-item img,
.avatar-fallback {
  width: 38px;
  height: 38px;
  border-radius: 50%;
}

.user-item img {
  object-fit: cover;
}

.avatar-fallback {
  display: grid;
  place-items: center;
  background: var(--color-primary-light);
  color: var(--color-primary);
  font-weight: 900;
}

.user-item strong {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  color: var(--color-text-main);
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.followed {
  flex: 0 0 auto;
  padding: 5px 10px;
  border-radius: 999px;
  background: var(--color-bg-muted);
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 800;
}

.view-all {
  justify-content: center;
  min-height: 34px;
  border-top: 1px solid var(--color-border-soft);
  padding-top: 14px;
  color: var(--color-text-secondary);
  font-size: 13px;
  font-weight: 800;
}

.sidebar-empty {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 13px;
}
</style>
