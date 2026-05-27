<template>
  <section class="sidebar-card">
    <header class="sidebar-head">
      <h2>可能感兴趣的人</h2>
      <button type="button" @click="$emit('refresh')">换一换</button>
    </header>
    <div v-if="items.length > 0" class="recommend-list">
      <article v-for="item in items" :key="item.userId" class="recommend-item">
        <RouterLink :to="`/users/${item.userId}`" class="recommend-user">
          <img v-if="item.avatar" :src="item.avatar" :alt="item.username" />
          <span v-else class="avatar-fallback">{{ item.username.slice(0, 1) }}</span>
          <span class="recommend-copy">
            <strong>{{ item.username }}</strong>
            <small>{{ item.reason || formatFollowers(item.followerCount) }}</small>
          </span>
        </RouterLink>
        <button
          type="button"
          class="follow-button"
          :class="{ followed: item.followed }"
          :disabled="loadingUserId === item.userId"
          @click="$emit('follow', item)"
        >
          {{ item.followed ? '已关注' : '关注' }}
        </button>
      </article>
    </div>
    <p v-else class="sidebar-empty">暂无推荐创作者</p>
  </section>
</template>

<script setup lang="ts">
import type { SidebarRecommendedUser } from '@/types/api';

defineProps<{
  items: SidebarRecommendedUser[];
  loadingUserId?: string;
}>();

defineEmits<{
  follow: [user: SidebarRecommendedUser];
  refresh: [];
}>();

function formatFollowers(value?: number) {
  if (value === undefined) return '近期活跃';
  if (value >= 10000) return `${(value / 10000).toFixed(value >= 100000 ? 0 : 1)}万粉丝`;
  return `${value}粉丝`;
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
.recommend-item,
.recommend-user {
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

.sidebar-head button {
  border: 0;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  font-size: 13px;
  font-weight: 800;
}

.sidebar-head button:hover {
  color: var(--color-primary);
}

.recommend-list {
  display: grid;
  gap: 14px;
}

.recommend-item {
  justify-content: space-between;
  gap: 12px;
}

.recommend-user {
  min-width: 0;
  gap: 10px;
}

.recommend-user img,
.avatar-fallback {
  width: 42px;
  height: 42px;
  border-radius: 50%;
}

.recommend-user img {
  object-fit: cover;
}

.avatar-fallback {
  display: grid;
  place-items: center;
  background: var(--color-primary-light);
  color: var(--color-primary);
  font-weight: 900;
}

.recommend-copy {
  display: grid;
  min-width: 0;
}

.recommend-copy strong {
  overflow: hidden;
  color: var(--color-text-main);
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recommend-copy small,
.sidebar-empty {
  color: var(--color-text-secondary);
}

.follow-button {
  flex: 0 0 auto;
  min-width: 62px;
  min-height: 34px;
  border: 0;
  border-radius: 999px;
  background: var(--color-primary);
  color: #ffffff;
  cursor: pointer;
  font-weight: 900;
  transition: background var(--gl-transition), color var(--gl-transition), transform var(--gl-transition);
}

.follow-button.followed {
  background: var(--color-bg-muted);
  color: var(--color-text-secondary);
}

.follow-button:hover:not(:disabled):not(.followed) {
  background: var(--color-primary-hover);
}

.follow-button:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.follow-button:active:not(:disabled) {
  transform: translateY(1px) scale(0.98);
}

.sidebar-empty {
  margin: 0;
  font-size: 13px;
}
</style>
