<template>
  <section class="sidebar-card">
    <header class="sidebar-head">
      <h2>正在直播</h2>
      <RouterLink to="/live">更多</RouterLink>
    </header>
    <div v-if="items.length > 0" class="live-list">
      <RouterLink v-for="item in items" :key="item.id" :to="`/live/${item.roomId}`" class="live-item">
        <div class="live-thumb">
          <img :src="item.cover" :alt="item.title" />
          <span>直播中</span>
        </div>
        <div class="live-info">
          <strong>{{ item.title }}</strong>
          <span>{{ item.authorName }}</span>
          <small>{{ formatCompactNumber(item.viewerCount) }}人观看</small>
        </div>
      </RouterLink>
    </div>
    <p v-else class="sidebar-empty">暂时没有正在直播的创作者</p>
  </section>
</template>

<script setup lang="ts">
import type { SidebarLiveItem } from '@/types/api';

defineProps<{
  items: SidebarLiveItem[];
}>();

function formatCompactNumber(value: number) {
  if (value >= 10000) return `${(value / 10000).toFixed(value >= 100000 ? 0 : 1)}万`;
  return String(value);
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

.sidebar-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.sidebar-head h2 {
  margin: 0;
  color: var(--color-text-main);
  font-size: 18px;
}

.sidebar-head a {
  color: var(--color-text-secondary);
  font-size: 13px;
  font-weight: 800;
}

.live-list {
  display: grid;
  gap: 12px;
}

.live-item {
  display: grid;
  grid-template-columns: 112px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
}

.live-thumb {
  position: relative;
  overflow: hidden;
  aspect-ratio: 16 / 9;
  border-radius: 9px;
  background: var(--color-bg-muted);
}

.live-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.live-thumb span {
  position: absolute;
  right: 6px;
  bottom: 6px;
  padding: 2px 6px;
  border-radius: 6px;
  background: var(--color-danger);
  color: #ffffff;
  font-size: 11px;
  font-weight: 900;
}

.live-info {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.live-info strong {
  overflow: hidden;
  color: var(--color-text-main);
  font-size: 14px;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.live-info span,
.live-info small,
.sidebar-empty {
  color: var(--color-text-secondary);
}

.live-info small {
  font-size: 12px;
}

.sidebar-empty {
  margin: 0;
  font-size: 13px;
}
</style>
