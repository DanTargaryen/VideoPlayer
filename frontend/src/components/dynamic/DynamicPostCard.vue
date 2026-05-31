<template>
  <div class="post-content">
    <p>{{ item.description || item.title }}</p>
    <div v-if="visibleImages.length > 0" class="post-images" :class="`count-${visibleImages.length}`">
      <div v-for="(image, index) in visibleImages" :key="`${image}-${index}`" class="post-image">
        <img :src="image" :alt="`${item.author.username} 的动态图片 ${index + 1}`" />
        <span v-if="index === 2 && hiddenImageCount > 0" class="image-more">+{{ hiddenImageCount }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import type { DynamicFeedItem } from '@/types/api';

const props = defineProps<{
  item: DynamicFeedItem;
}>();

const visibleImages = computed(() => (props.item.images ?? []).slice(0, 3));
const hiddenImageCount = computed(() => Math.max(0, (props.item.images?.length ?? 0) - 3));
</script>

<style scoped>
.post-content {
  display: grid;
  gap: 12px;
}

.post-content p {
  margin: 0;
  color: var(--color-text-main);
  font-size: 14px;
  line-height: 1.7;
}

.post-images {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.post-image {
  position: relative;
  overflow: hidden;
  aspect-ratio: 16 / 9;
  border-radius: 10px;
  background: var(--color-bg-muted);
}

.post-images.count-1 {
  grid-template-columns: minmax(0, 1fr);
}

.post-images.count-1 .post-image {
  aspect-ratio: 16 / 9;
  max-height: 360px;
}

.post-images.count-2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.post-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 320ms cubic-bezier(0.16, 1, 0.3, 1);
}

.post-image:hover img {
  transform: scale(1.025);
}

.image-more {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(15, 23, 42, 0.48);
  color: #ffffff;
  font-size: 22px;
  font-weight: 900;
}

@media (max-width: 560px) {
  .post-images {
    grid-template-columns: 1fr;
  }
}
</style>
