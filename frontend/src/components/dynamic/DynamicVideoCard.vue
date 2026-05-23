<template>
  <RouterLink :to="`/video/${videoId}`" class="video-content">
    <div class="media-frame">
      <img :src="item.cover" :alt="item.title" />
      <span v-if="durationLabel" class="duration">{{ durationLabel }}</span>
    </div>
    <div class="video-copy">
      <h3>{{ item.title }}</h3>
      <p>{{ item.description || '这个创作者刚刚发布了一个新视频。' }}</p>
      <span v-if="item.category" class="category">{{ item.category }}</span>
      <div class="stat-row">
        <span><el-icon><VideoPlay /></el-icon>{{ formatCompactNumber(item.stats?.views ?? 0) }}</span>
        <span><el-icon><ChatDotRound /></el-icon>{{ formatCompactNumber(item.stats?.comments ?? 0) }}</span>
        <span><el-icon><Pointer /></el-icon>{{ formatCompactNumber(item.stats?.likes ?? 0) }}</span>
      </div>
    </div>
  </RouterLink>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { ChatDotRound, Pointer, VideoPlay } from '@element-plus/icons-vue';

import type { DynamicFeedItem } from '@/types/api';

const props = defineProps<{
  item: DynamicFeedItem;
}>();

const videoId = computed(() => props.item.id.replace(/^video-/, ''));
const durationLabel = computed(() => {
  const seconds = props.item.duration ?? 0;
  if (!seconds) return '';
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
});

function formatCompactNumber(value: number) {
  if (value >= 10000) return `${(value / 10000).toFixed(value >= 100000 ? 0 : 1)}万`;
  return String(value);
}
</script>

<style scoped>
.video-content {
  display: grid;
  grid-template-columns: minmax(260px, 1.05fr) minmax(220px, 0.95fr);
  gap: 22px;
  align-items: center;
}

.media-frame {
  position: relative;
  overflow: hidden;
  aspect-ratio: 16 / 9;
  border-radius: 10px;
  background: var(--color-bg-muted);
}

.media-frame img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 320ms cubic-bezier(0.16, 1, 0.3, 1);
}

.video-content:hover img {
  transform: scale(1.025);
}

.duration {
  position: absolute;
  right: 8px;
  bottom: 8px;
  padding: 3px 7px;
  border-radius: 7px;
  background: rgba(15, 23, 42, 0.78);
  color: #ffffff;
  font-size: 12px;
  font-weight: 800;
}

.video-copy {
  display: grid;
  align-content: center;
  gap: 12px;
  min-width: 0;
}

.video-copy h3 {
  margin: 0;
  color: var(--color-text-main);
  font-size: 19px;
  line-height: 1.35;
}

.video-copy p {
  display: -webkit-box;
  margin: 0;
  overflow: hidden;
  color: var(--color-text-secondary);
  line-height: 1.6;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
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

.stat-row {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
  color: var(--color-text-secondary);
  font-size: 13px;
}

.stat-row span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

@media (max-width: 720px) {
  .video-content {
    grid-template-columns: 1fr;
  }
}
</style>
