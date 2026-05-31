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
  { label: '全部', value: 'all' },
  { label: '视频投稿', value: 'video' },
  { label: '图文动态', value: 'post' },
  { label: '直播', value: 'live' },
  { label: '推荐', value: 'recommend' },
];
</script>

<style scoped>
.feed-tabs {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  min-height: 36px;
  padding: 0 2px;
  scrollbar-width: none;
}

.feed-tabs::-webkit-scrollbar {
  display: none;
}

.tab-button {
  position: relative;
  flex: 0 0 auto;
  min-height: 36px;
  padding: 0 10px;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: var(--color-text-main);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: transform var(--gl-transition), color var(--gl-transition), border-color var(--gl-transition),
    background var(--gl-transition), box-shadow var(--gl-transition);
}

.tab-button:hover,
.tab-button.active {
  color: var(--color-primary);
}

.tab-button::after {
  position: absolute;
  right: 10px;
  bottom: 0;
  left: 10px;
  height: 2px;
  border-radius: 999px;
  background: var(--color-primary);
  content: '';
  opacity: 0;
  transform: scaleX(0.3);
  transition: opacity var(--gl-transition), transform var(--gl-transition);
}

.tab-button.active::after {
  opacity: 1;
  transform: scaleX(1);
}

.tab-button:active {
  transform: translateY(1px) scale(0.99);
}
</style>
