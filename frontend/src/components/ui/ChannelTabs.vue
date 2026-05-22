<template>
  <div class="channel-tabs" role="tablist">
    <button
      v-for="item in items"
      :key="String(item.value)"
      type="button"
      class="tab"
      :class="{ active: item.value === modelValue }"
      role="tab"
      :aria-selected="item.value === modelValue"
      @click="$emit('update:modelValue', item.value)"
    >
      {{ item.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: string;
  items: Array<{ label: string; value: string }>;
}>();

defineEmits<{
  'update:modelValue': [value: string];
}>();
</script>

<style scoped>
.channel-tabs {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow-x: auto;
  padding: 4px;
  border: 1px solid var(--gl-border);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.72);
  scrollbar-width: none;
}

.channel-tabs::-webkit-scrollbar {
  display: none;
}

.tab {
  flex: 0 0 auto;
  padding: 9px 14px;
  border: 0;
  border-radius: 12px;
  background: transparent;
  color: var(--gl-text-secondary);
  cursor: pointer;
  font-size: 14px;
  font-weight: 700;
  transition: background-color var(--gl-transition), color var(--gl-transition), transform var(--gl-transition);
}

.tab:hover {
  color: var(--gl-primary);
  background: var(--gl-primary-soft);
}

.tab:active {
  transform: scale(0.98);
}

.tab.active {
  color: var(--gl-primary);
  background: var(--gl-primary-soft);
}
</style>
