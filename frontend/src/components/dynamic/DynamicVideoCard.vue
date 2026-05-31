<template>
  <RouterLink :to="`/video/${videoId}`" class="video-content">
    <div class="media-frame">
      <img :src="item.cover" :alt="item.title" />
      <span class="play-button" aria-hidden="true">
        <el-icon><VideoPlay /></el-icon>
      </span>
      <span v-if="durationLabel" class="duration">{{ durationLabel }}</span>
    </div>
    <div class="video-copy">
      <h3>{{ item.title }}</h3>
      <span v-if="item.category" class="category">{{ item.category }}</span>
      <div class="stat-row">
        <span><el-icon><View /></el-icon>{{ formatCompactNumber(item.stats?.views ?? 0) }}</span>
        <span><el-icon><ChatDotRound /></el-icon>{{ formatCompactNumber(item.stats?.comments ?? 0) }}</span>
      </div>
    </div>
  </RouterLink>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { ChatDotRound, VideoPlay, View } from '@element-plus/icons-vue';

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
  grid-template-columns: 160px minmax(0, 1fr);
  gap: 16px;
  align-items: center;
}

.media-frame {
  position: relative;
  overflow: hidden;
  width: 160px;
  height: 90px;
  border-radius: 8px;
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

.play-button,
.duration {
  position: absolute;
  color: #ffffff;
}

.play-button {
  top: 50%;
  left: 50%;
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: rgba(15, 23, 42, 0.64);
  transform: translate(-50%, -50%);
}

.duration {
  right: 8px;
  bottom: 8px;
  padding: 3px 7px;
  border-radius: 7px;
  background: rgba(15, 23, 42, 0.78);
  font-size: 12px;
  font-weight: 800;
}

.video-copy {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.video-copy h3 {
  display: -webkit-box;
  margin: 0;
  overflow: hidden;
  color: var(--color-text-main);
  font-size: 14px;
  font-weight: 800;
  line-height: 1.45;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.category {
  justify-self: start;
  padding: 4px 8px;
  border-radius: 7px;
  background: var(--color-primary-light);
  color: var(--color-primary);
  font-size: 11px;
  font-weight: 800;
}

.stat-row {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  color: var(--color-text-secondary);
  font-size: 12px;
}

.stat-row span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

@media (max-width: 560px) {
  .video-content {
    grid-template-columns: 130px minmax(0, 1fr);
    gap: 12px;
  }

  .media-frame {
    width: 130px;
    height: 73px;
  }
}
</style>
