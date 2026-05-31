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
  gap: 12px;
}

.live-media {
  position: relative;
  overflow: hidden;
  aspect-ratio: 16 / 9;
  border-radius: 12px;
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
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px 12px;
  align-items: center;
}

.live-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.live-title-row h3 {
  margin: 0;
  color: var(--color-text-main);
  font-size: 15px;
  font-weight: 800;
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
  grid-column: 1 / -1;
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 13px;
  line-height: 1.55;
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
  grid-row: 1 / span 2;
  grid-column: 2;
  justify-self: end;
  padding: 9px 16px;
  border: 1px solid var(--color-primary);
  border-radius: 999px;
  background: var(--color-primary);
  color: #ffffff;
  font-weight: 900;
  transition: color var(--gl-transition), background var(--gl-transition), transform var(--gl-transition);
}

.enter-button:hover {
  background: var(--color-primary-hover);
  color: #ffffff;
}

.enter-button:active {
  transform: translateY(1px) scale(0.98);
}

@media (max-width: 560px) {
  .live-copy {
    grid-template-columns: 1fr;
  }

  .enter-button {
    grid-row: auto;
    grid-column: auto;
    justify-self: start;
  }
}
</style>
