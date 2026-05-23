<template>
  <div class="video-action-bar">
    <div class="action-pill-group" role="group" aria-label="视频操作">
      <button class="action-pill" :class="{ active: video.isLiked }" type="button" @click="$emit('like')">
        <el-icon :size="18"><CaretTop /></el-icon>
        <span>赞</span>
        <strong>{{ formatCompactNumber(video.likeCount) }}</strong>
      </button>
      <button class="action-pill" :class="{ active: video.isFavorited }" type="button" @click="$emit('favorite')">
        <el-icon :size="18"><Star /></el-icon>
        <span>收藏</span>
        <strong>{{ formatCompactNumber(video.favoriteCount) }}</strong>
      </button>
      <button
        class="action-pill"
        :class="{ active: video.myCoinCount > 0 }"
        type="button"
        :disabled="remainingCoinLimit === 0 || coiningVideo"
        @click="$emit('coin')"
      >
        <el-icon :size="18"><Coin /></el-icon>
        <span>投币</span>
        <strong>{{ formatCompactNumber(video.coinCount ?? 0) }}</strong>
      </button>
      <button class="action-pill" type="button" @click="$emit('comments')">
        <el-icon :size="18"><ChatDotRound /></el-icon>
        <span>评论</span>
        <strong>{{ formatCompactNumber(video.commentCount) }}</strong>
      </button>
      <button class="action-pill" type="button" @click="$emit('share')">
        <el-icon :size="18"><Share /></el-icon>
        <span>分享</span>
      </button>
      <button class="action-pill action-pill-icon" type="button" aria-label="更多" @click="$emit('more')">
        <el-icon :size="18"><MoreFilled /></el-icon>
      </button>
    </div>

    <button class="report-action" type="button" @click="$emit('report')">
      <el-icon :size="15"><Warning /></el-icon>
      <span>举报</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { CaretTop, ChatDotRound, Coin, MoreFilled, Share, Star, Warning } from '@element-plus/icons-vue';
import type { VideoDetail } from '@/types/api';

defineProps<{
  video: VideoDetail;
  remainingCoinLimit: number;
  coiningVideo: boolean;
}>();

defineEmits<{
  (e: 'like'): void;
  (e: 'favorite'): void;
  (e: 'coin'): void;
  (e: 'comments'): void;
  (e: 'share'): void;
  (e: 'more'): void;
  (e: 'report'): void;
}>();

function formatCompactNumber(value?: number | null) {
  const count = Number(value ?? 0);
  if (count >= 10000) {
    return `${(count / 10000).toFixed(count >= 100000 ? 0 : 1)}万`;
  }
  return String(count);
}
</script>

<style scoped>
.video-action-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 0 10px;
  border-bottom: 1px solid var(--color-border-soft);
  background: var(--color-bg-card);
}

.action-pill-group {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.action-pill,
.report-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 38px;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: var(--color-bg-card);
  color: #334155;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition:
    transform 180ms cubic-bezier(0.16, 1, 0.3, 1),
    border-color 180ms cubic-bezier(0.16, 1, 0.3, 1),
    background 180ms cubic-bezier(0.16, 1, 0.3, 1),
    color 180ms cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 180ms cubic-bezier(0.16, 1, 0.3, 1);
}

.action-pill {
  padding: 0 17px;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.025);
}

.action-pill :deep(.el-icon) {
  color: var(--color-text-secondary);
}

.action-pill strong {
  color: var(--color-text-secondary);
  font-size: 14px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.action-pill:hover {
  transform: translateY(-1px);
  border-color: var(--color-primary-soft);
  color: var(--color-primary);
  box-shadow: 0 8px 18px rgba(37, 99, 235, 0.08);
}

.action-pill:hover :deep(.el-icon) {
  color: var(--color-primary);
}

.action-pill:active,
.report-action:active {
  transform: scale(0.98);
}

.action-pill.active {
  border-color: var(--color-primary-soft);
  background: var(--color-primary-light);
  color: var(--color-primary);
  box-shadow: inset 0 0 0 1px rgba(37, 99, 235, 0.04);
}

.action-pill.active :deep(.el-icon) {
  color: var(--color-primary);
}

.action-pill.active strong {
  color: var(--color-primary);
}

.action-pill:disabled {
  cursor: not-allowed;
  opacity: 0.48;
  transform: none;
}

.action-pill-icon {
  width: 38px;
  padding: 0;
}

.report-action {
  min-height: 32px;
  padding: 0 10px;
  border-color: transparent;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 14px;
  font-weight: 700;
  box-shadow: none;
}

.report-action:hover {
  background: #FEF2F2;
  color: var(--color-danger);
}

@media (max-width: 760px) {
  .video-action-bar {
    align-items: flex-start;
    padding-top: 12px;
  }

  .action-pill {
    min-height: 40px;
    padding: 0 13px;
    font-size: 13px;
  }

  .report-action {
    margin-left: auto;
  }
}
</style>
