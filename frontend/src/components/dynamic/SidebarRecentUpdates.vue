<template>
  <section class="sidebar-card">
    <header class="sidebar-head">
      <h2>最近更新</h2>
      <span>更多</span>
    </header>
    <div v-if="items.length > 0" class="update-list">
      <RouterLink v-for="item in items" :key="item.userId" :to="`/users/${item.userId}`" class="update-item">
        <img v-if="item.avatar" :src="item.avatar" :alt="item.username" />
        <span v-else class="avatar-fallback">{{ item.username.slice(0, 1) }}</span>
        <span class="update-copy">
          <strong>{{ item.username }}</strong>
          <small>{{ item.lastActionText }}</small>
        </span>
        <time>{{ formatRelativeTime(item.lastUpdateAt) }}</time>
      </RouterLink>
    </div>
    <p v-else class="sidebar-empty">关注创作者后会显示他们的更新</p>
  </section>
</template>

<script setup lang="ts">
import type { SidebarRecentUpdateItem } from '@/types/api';

defineProps<{
  items: SidebarRecentUpdateItem[];
}>();

function formatRelativeTime(value: string) {
  const diffMs = Date.now() - Date.parse(value);
  const minutes = Math.max(1, Math.floor(diffMs / 60000));
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  return `昨天 ${new Date(value).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
}
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
.update-item {
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

.update-list {
  display: grid;
  gap: 14px;
}

.update-item {
  gap: 10px;
}

.update-item img,
.avatar-fallback {
  width: 38px;
  height: 38px;
  border-radius: 50%;
}

.update-item img {
  object-fit: cover;
}

.avatar-fallback {
  display: grid;
  place-items: center;
  background: var(--color-primary-light);
  color: var(--color-primary);
  font-weight: 900;
}

.update-copy {
  display: grid;
  flex: 1;
  min-width: 0;
}

.update-copy strong {
  overflow: hidden;
  color: var(--color-text-main);
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.update-copy small,
.update-item time,
.sidebar-empty {
  color: var(--color-text-secondary);
}

.update-item time {
  flex: 0 0 auto;
  font-size: 12px;
}

.sidebar-empty {
  margin: 0;
  font-size: 13px;
}
</style>
