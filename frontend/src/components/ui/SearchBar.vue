<template>
  <SearchSuggestBox
    :model-value="modelValue"
    :placeholder="placeholder"
    @update:model-value="emit('update:modelValue', $event)"
    @search="emit('search', $event)"
  />
</template>

<script setup lang="ts">
import SearchSuggestBox from '@/components/SearchSuggestBox.vue';

withDefaults(
  defineProps<{
    modelValue: string;
    placeholder?: string;
  }>(),
  {
    placeholder: '搜索视频、UP主或内容',
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: string];
  search: [value: string];
}>();
</script>
