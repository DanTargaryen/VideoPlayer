<template>
  <section class="image-text-card">
    <p>{{ item.description || item.title }}</p>
    <DynamicImageGrid v-if="images.length > 0" :images="images" />
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { DynamicFeedItem } from '@/types/api';
import DynamicImageGrid from './DynamicImageGrid.vue';

const props = defineProps<{
  item: DynamicFeedItem;
}>();

const images = computed(() => props.item.images ?? []);
</script>

<style scoped>
.image-text-card {
  display: grid;
  gap: 12px;
}

.image-text-card p {
  margin: 0;
  color: var(--color-text-main);
  font-size: 14px;
  line-height: 1.7;
  overflow-wrap: anywhere;
}
</style>
