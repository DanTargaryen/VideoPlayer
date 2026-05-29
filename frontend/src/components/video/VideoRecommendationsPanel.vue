<template>
  <section class="recommend-panel">
    <div class="recommend-head">
      <h2>相关推荐</h2>
      <div class="recommend-actions">
        <button class="refresh-btn" type="button" :disabled="loading" @click="$emit('refresh')">
          <el-icon :size="15" :class="{ spinning: loading }"><RefreshRight /></el-icon>
          <span>换一换</span>
        </button>
        <label class="autoplay-toggle">
          <span>自动连播</span>
          <el-switch
            :model-value="autoplay"
            size="small"
            @update:model-value="$emit('update:autoplay', Boolean($event))"
          />
        </label>
      </div>
    </div>

    <div class="recommend-list">
      <RouterLink v-for="item in recommendations" :key="item.id" :to="`/video/${item.id}`" class="recommend-item">
        <div class="recommend-cover-wrap">
          <img :src="item.coverUrl" :alt="item.title" class="recommend-cover" />
          <span v-if="formatDuration(item.durationSeconds)" class="duration-badge">
            {{ formatDuration(item.durationSeconds) }}
          </span>
        </div>
        <div class="recommend-info">
          <strong>{{ item.title }}</strong>
          <span class="recommend-author">{{ item.creator?.nickname ?? '观澜创作者' }}</span>
          <span class="recommend-meta">{{ formatCompactNumber(item.playCount ?? 0) }}观看 · {{ formatRelativeTime(item.publishedAt ?? item.createdAt) }}</span>
        </div>
      </RouterLink>
      <el-empty v-if="recommendations.length === 0" description="暂无相关推荐" :image-size="72" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { RefreshRight } from '@element-plus/icons-vue';
import type { VideoCard } from '@/types/api';

defineProps<{
  recommendations: VideoCard[];
  loading: boolean;
  autoplay: boolean;
}>();

defineEmits<{
  (e: 'refresh'): void;
  (e: 'update:autoplay', value: boolean): void;
}>();

function formatDuration(value?: number | null) {
  const totalSeconds = Math.max(0, Math.floor(Number(value ?? 0)));
  if (!totalSeconds) {
    return '';
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatCompactNumber(value?: number | null) {
  const count = Number(value ?? 0);
  if (count >= 10000) {
    return `${(count / 10000).toFixed(count >= 100000 ? 0 : 1)}万`;
  }
  return String(count);
}

function formatRelativeTime(value?: string | null) {
  if (!value) {
    return '刚刚';
  }

  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) {
    return '刚刚';
  }

  const diffMs = Date.now() - timestamp;
  const dayMs = 24 * 60 * 60 * 1000;
  if (diffMs < dayMs) {
    return '今天';
  }
  if (diffMs < dayMs * 30) {
    return `${Math.max(1, Math.floor(diffMs / dayMs))}天前`;
  }
  if (diffMs < dayMs * 365) {
    return `${Math.max(1, Math.floor(diffMs / (dayMs * 30)))}月前`;
  }
  return `${Math.max(1, Math.floor(diffMs / (dayMs * 365)))}年前`;
}
</script>

<style scoped>
.recommend-panel {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 16px;
  max-height: min(640px, calc(100dvh - 112px));
  padding: 20px;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: 20px;
  background: var(--color-bg-card);
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
}

.recommend-head {
  display: grid;
  gap: 12px;
}

.recommend-head h2 {
  margin: 0;
  color: var(--color-text-main);
  font-size: 20px;
  font-weight: 800;
}

.recommend-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.refresh-btn,
.autoplay-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 30px;
  border: 0;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 13px;
  font-weight: 650;
}

.refresh-btn {
  cursor: pointer;
}

.refresh-btn:hover {
  color: var(--color-primary);
}

.refresh-btn:disabled {
  cursor: wait;
  opacity: 0.62;
}

.spinning {
  animation: spin 860ms linear infinite;
}

.recommend-list {
  display: grid;
  gap: 2px;
  min-height: 0;
  overflow-y: scroll;
  overscroll-behavior: contain;
  padding-right: 6px;
  scrollbar-color: rgba(37, 99, 235, 0.46) rgba(226, 232, 240, 0.74);
  scrollbar-gutter: stable;
  scrollbar-width: thin;
}

.recommend-list::-webkit-scrollbar {
  width: 8px;
}

.recommend-list::-webkit-scrollbar-track {
  border-radius: 999px;
  background: rgba(226, 232, 240, 0.82);
}

.recommend-list::-webkit-scrollbar-thumb {
  border: 2px solid transparent;
  border-radius: 999px;
  background: rgba(100, 116, 139, 0.72);
  background-clip: content-box;
}

.recommend-list::-webkit-scrollbar-thumb:hover {
  background: rgba(37, 99, 235, 0.78);
  background-clip: content-box;
}

.recommend-item {
  display: grid;
  grid-template-columns: 140px minmax(0, 1fr);
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--color-border-soft);
  transition:
    transform 180ms cubic-bezier(0.16, 1, 0.3, 1),
    background 180ms cubic-bezier(0.16, 1, 0.3, 1);
}

.recommend-item:last-child {
  border-bottom: 0;
}

.recommend-item:hover {
  transform: translateY(-1px);
  background: var(--color-primary-light);
}

.recommend-cover-wrap {
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: 10px;
  background: #111827;
}

.recommend-cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 220ms cubic-bezier(0.16, 1, 0.3, 1);
}

.recommend-item:hover .recommend-cover {
  transform: scale(1.025);
}

.duration-badge {
  position: absolute;
  right: 6px;
  bottom: 6px;
  padding: 2px 6px;
  border-radius: 6px;
  background: rgba(17, 24, 39, 0.82);
  color: #ffffff;
  font-size: 11px;
  font-weight: 750;
  font-variant-numeric: tabular-nums;
}

.recommend-info {
  display: grid;
  align-content: start;
  gap: 5px;
  min-width: 0;
}

.recommend-info strong {
  display: -webkit-box;
  overflow: hidden;
  color: var(--color-text-main);
  font-size: 14px;
  line-height: 1.45;
  font-weight: 750;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.recommend-author,
.recommend-meta {
  overflow: hidden;
  color: var(--color-text-muted);
  font-size: 12px;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 520px) {
  .recommend-panel {
    max-height: 62dvh;
    padding: 16px;
  }

  .recommend-item {
    grid-template-columns: 118px minmax(0, 1fr);
  }
}
</style>
