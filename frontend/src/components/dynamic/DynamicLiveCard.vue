<template>
  <div class="live-content">
    <RouterLink :to="`/live/${item.live?.roomId}`" class="live-media">
      <img :src="item.cover" :alt="item.title" />
      <span class="live-badge">LIVE</span>
      <span class="viewer-count">{{ formatCompactNumber(item.live?.viewerCount ?? 0) }}人观看</span>
    </RouterLink>
    <div class="live-copy">
      <div class="live-title-row">
        <h3>{{ item.title }}</h3>
        <span class="living">直播中</span>
      </div>
      <p>{{ item.description || '你关注的创作者正在直播。' }}</p>
      <span v-if="item.category" class="category">{{ item.category }}</span>
      <RouterLink :to="`/live/${item.live?.roomId}`" class="enter-button">进入直播间</RouterLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DynamicFeedItem } from '@/types/api';

defineProps<{
  item: DynamicFeedItem;
}>();

function formatCompactNumber(value: number) {
  if (value >= 10000) return `${(value / 10000).toFixed(value >= 100000 ? 0 : 1)}万`;
  return String(value);
}
</script>

<style scoped>
.live-content {
  display: grid;
  grid-template-columns: minmax(280px, 1.2fr) minmax(220px, 0.8fr);
  gap: 22px;
  align-items: center;
}

.live-media {
  position: relative;
  overflow: hidden;
  aspect-ratio: 16 / 9;
  border-radius: 10px;
  background: var(--color-bg-muted);
}

.live-media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 320ms cubic-bezier(0.16, 1, 0.3, 1);
}

.live-media:hover img {
  transform: scale(1.025);
}

.live-badge,
.viewer-count {
  position: absolute;
  left: 10px;
  border-radius: 8px;
  color: #ffffff;
  font-size: 12px;
  font-weight: 900;
}

.live-badge {
  top: 10px;
  padding: 5px 8px;
  background: var(--color-danger);
}

.viewer-count {
  bottom: 10px;
  padding: 4px 8px;
  background: rgba(15, 23, 42, 0.72);
}

.live-copy {
  display: grid;
  gap: 13px;
}

.live-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.live-title-row h3 {
  margin: 0;
  color: var(--color-text-main);
  font-size: 19px;
  line-height: 1.35;
}

.living {
  flex: 0 0 auto;
  padding: 4px 8px;
  border-radius: 999px;
  background: #fff1f2;
  color: var(--color-danger);
  font-size: 12px;
  font-weight: 900;
}

.live-copy p {
  margin: 0;
  color: var(--color-text-secondary);
}

.category {
  justify-self: start;
  padding: 5px 9px;
  border-radius: 8px;
  background: var(--color-primary-light);
  color: var(--color-primary);
  font-size: 12px;
  font-weight: 800;
}

.enter-button {
  justify-self: start;
  padding: 10px 18px;
  border: 1px solid var(--color-primary);
  border-radius: 10px;
  color: var(--color-primary);
  font-weight: 900;
  transition: color var(--gl-transition), background var(--gl-transition), transform var(--gl-transition);
}

.enter-button:hover {
  background: var(--color-primary);
  color: #ffffff;
}

.enter-button:active {
  transform: translateY(1px) scale(0.98);
}

@media (max-width: 720px) {
  .live-content {
    grid-template-columns: 1fr;
  }
}
</style>
