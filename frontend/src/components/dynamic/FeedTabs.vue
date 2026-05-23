<template>
  <div class="feed-tabs" role="tablist" aria-label="动态筛选">
    <button
      v-for="tab in tabs"
      :key="tab.value"
      type="button"
      class="tab-button"
      :class="{ active: modelValue === tab.value }"
      @click="$emit('update:modelValue', tab.value)"
    >
      {{ tab.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
import type { DynamicFeedType } from '@/types/api';

defineProps<{
  modelValue: DynamicFeedType;
}>();

defineEmits<{
  'update:modelValue': [value: DynamicFeedType];
}>();

const tabs: Array<{ label: string; value: DynamicFeedType }> = [
  { label: '全部动态', value: 'all' },
  { label: '视频投稿', value: 'video' },
  { label: '图文动态', value: 'post' },
  { label: '直播提醒', value: 'live' },
];
</script>

<style scoped>
.feed-tabs {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding: 2px 2px 8px;
  scrollbar-width: none;
}

.feed-tabs::-webkit-scrollbar {
  display: none;
}

.tab-button {
  flex: 0 0 auto;
  min-height: 40px;
  padding: 0 20px;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: var(--color-bg-card);
  color: var(--color-text-main);
  font-weight: 700;
  cursor: pointer;
  transition: transform var(--gl-transition), color var(--gl-transition), border-color var(--gl-transition),
    background var(--gl-transition), box-shadow var(--gl-transition);
}

.tab-button:hover,
.tab-button.active {
  border-color: #bfdbfe;
  background: var(--color-primary-light);
  color: var(--color-primary);
}

.tab-button.active {
  box-shadow: 0 8px 18px rgba(37, 99, 235, 0.08);
}

.tab-button:active {
  transform: translateY(1px) scale(0.99);
}
</style>
