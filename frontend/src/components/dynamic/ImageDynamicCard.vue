<template>
  <section class="image-card">
    <DynamicImageGrid :images="images" />
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
.image-card {
  display: grid;
}
</style>
