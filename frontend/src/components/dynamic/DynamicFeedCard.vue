<template>
  <article class="feed-card" :style="{ '--item-index': index }">
    <header class="feed-card-head">
      <RouterLink :to="`/users/${item.author.id}`" class="author-link">
        <img v-if="item.author.avatar" :src="item.author.avatar" :alt="item.author.username" class="avatar" />
        <span v-else class="avatar fallback">{{ item.author.username.slice(0, 1) }}</span>
        <span class="author-copy">
          <strong>{{ item.author.username }}</strong>
          <span>{{ item.actionText }} · {{ relativeTime }}</span>
        </span>
      </RouterLink>
      <button type="button" class="more-button" aria-label="更多">
        <el-icon><MoreFilled /></el-icon>
      </button>
    </header>

    <DynamicVideoCard v-if="item.type === 'video'" :item="item" />
    <DynamicLiveCard v-else-if="item.type === 'live'" :item="item" />
    <DynamicPostCard v-else :item="item" />

    <footer class="interaction-row">
      <button v-for="action in actions" :key="action.label" type="button" class="interaction-button">
        <el-icon><component :is="action.icon" /></el-icon>
        <span>{{ action.label }}</span>
      </button>
    </footer>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { ChatDotRound, MoreFilled, Pointer, Share, Star } from '@element-plus/icons-vue';

import type { DynamicFeedItem } from '@/types/api';
import DynamicLiveCard from './DynamicLiveCard.vue';
import DynamicPostCard from './DynamicPostCard.vue';
import DynamicVideoCard from './DynamicVideoCard.vue';

const props = defineProps<{
  item: DynamicFeedItem;
  index: number;
}>();

const actions = [
  { label: '点赞', icon: Pointer },
  { label: '评论', icon: ChatDotRound },
  { label: '收藏', icon: Star },
  { label: '分享', icon: Share },
];

const relativeTime = computed(() => formatRelativeTime(props.item.createdAt));

function formatRelativeTime(value: string) {
  const diffMs = Date.now() - Date.parse(value);
  const minutes = Math.max(1, Math.floor(diffMs / 60000));
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 2) {
    return `昨天 ${new Date(value).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
  }
  return `${days}天前`;
}
</script>

<style scoped>
.feed-card {
  display: grid;
  gap: 18px;
  padding: 22px;
  border: 1px solid var(--color-border);
  border-radius: 18px;
  background: var(--color-bg-card);
  box-shadow: var(--gl-shadow-card);
  animation: feed-card-in 420ms cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: calc(var(--item-index) * 45ms);
  transition: transform var(--gl-transition), box-shadow var(--gl-transition), border-color var(--gl-transition);
}

.feed-card:hover {
  border-color: #dbeafe;
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.07);
  transform: translateY(-2px);
}

.feed-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.author-link {
  display: inline-flex;
  align-items: center;
  min-width: 0;
  gap: 12px;
}

.avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  object-fit: cover;
}

.avatar.fallback {
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #dbeafe, #f1f5f9);
  color: var(--color-primary);
  font-weight: 900;
}

.author-copy {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.author-copy strong {
  color: var(--color-text-main);
  font-size: 15px;
}

.author-copy span {
  color: var(--color-text-secondary);
  font-size: 13px;
}

.more-button {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: background var(--gl-transition), color var(--gl-transition), transform var(--gl-transition);
}

.more-button:hover {
  background: var(--color-bg-muted);
  color: var(--color-primary);
}

.more-button:active {
  transform: scale(0.96);
}

.interaction-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  border-top: 1px solid var(--color-border-soft);
  padding-top: 12px;
}

.interaction-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 34px;
  border: 0;
  border-right: 1px solid var(--color-border-soft);
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  font-weight: 700;
  transition: color var(--gl-transition), transform var(--gl-transition);
}

.interaction-button:last-child {
  border-right: 0;
}

.interaction-button:hover {
  color: var(--color-primary);
}

.interaction-button:active {
  transform: translateY(1px) scale(0.98);
}

@keyframes feed-card-in {
  from {
    opacity: 0;
    transform: translateY(14px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 560px) {
  .feed-card {
    padding: 18px;
  }

  .interaction-row {
    grid-template-columns: repeat(2, 1fr);
    row-gap: 8px;
  }

  .interaction-button:nth-child(2) {
    border-right: 0;
  }
}
</style>
