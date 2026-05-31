<template>
  <section class="sidebar-card hot-topic-card">
    <header class="sidebar-head">
      <h2>热门话题</h2>
      <RouterLink to="/search?tab=video">更多</RouterLink>
    </header>
    <div class="topic-list">
      <RouterLink
        v-for="topic in topics"
        :key="topic.id"
        :to="{ path: '/search', query: { keyword: topic.name, tab: 'video' } }"
        class="topic-item"
      >
        <span class="topic-mark">#</span>
        <strong># {{ topic.name }}</strong>
        <small>{{ formatCompactNumber(topic.discussionCount) }}讨论</small>
        <em v-if="topic.isRising">热</em>
      </RouterLink>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { HotTopicItem } from '@/types/api';

defineProps<{
  topics: HotTopicItem[];
}>();

function formatCompactNumber(value: number) {
  if (value >= 10000) return `${(value / 10000).toFixed(value >= 100000 ? 0 : 1)}万`;
  return String(value);
}
</script>

<style scoped>
.sidebar-card {
  display: grid;
  gap: 14px;
  padding: 18px;
  border: 1px solid var(--color-border);
  border-radius: 16px;
  background: var(--color-bg-card);
  box-shadow: var(--gl-shadow-card);
}

.sidebar-head,
.topic-item {
  display: flex;
  align-items: center;
}

.sidebar-head {
  justify-content: space-between;
  gap: 12px;
}

.sidebar-head h2 {
  margin: 0;
  color: var(--color-text-main);
  font-size: 16px;
}

.sidebar-head a {
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 800;
}

.topic-list {
  display: grid;
  gap: 4px;
}

.topic-item {
  gap: 9px;
  min-height: 38px;
  border-radius: 999px;
  padding: 0 8px;
  color: var(--color-text-main);
  transition: background var(--gl-transition), color var(--gl-transition), transform var(--gl-transition);
}

.topic-item:hover {
  background: var(--color-primary-light);
  color: var(--color-primary);
}

.topic-item:active {
  transform: translateY(1px) scale(0.99);
}

.topic-mark {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--color-primary-light);
  color: var(--color-primary);
  font-weight: 900;
}

.topic-item strong {
  flex: 1;
  overflow: hidden;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.topic-item small {
  color: var(--color-text-secondary);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.topic-item em {
  flex: 0 0 auto;
  border-radius: 6px;
  padding: 2px 5px;
  background: #fff7ed;
  color: #ea580c;
  font-size: 10px;
  font-style: normal;
  font-weight: 900;
}
</style>
