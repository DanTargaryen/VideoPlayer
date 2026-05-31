<template>
  <div class="image-grid" :class="gridClass">
    <button
      v-for="(image, index) in visibleImages"
      :key="`${image}-${index}`"
      type="button"
      class="image-tile"
      @click.stop="openPreview(index)"
    >
      <img :src="image" :alt="`动态图片 ${index + 1}`" />
      <span v-if="index === visibleImages.length - 1 && hiddenCount > 0" class="image-more">+{{ hiddenCount }}</span>
    </button>
  </div>

  <Teleport to="body">
    <div v-if="previewVisible" class="preview-mask" @click="closePreview">
      <button type="button" class="preview-close" aria-label="关闭预览" @click.stop="closePreview">x</button>
      <button v-if="images.length > 1" type="button" class="preview-nav prev" @click.stop="movePreview(-1)">&lt;</button>
      <img :src="images[previewIndex]" :alt="`动态图片预览 ${previewIndex + 1}`" class="preview-image" @click.stop />
      <button v-if="images.length > 1" type="button" class="preview-nav next" @click.stop="movePreview(1)">&gt;</button>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

const props = defineProps<{
  images: string[];
}>();

const previewVisible = ref(false);
const previewIndex = ref(0);

const visibleLimit = computed(() => {
  if (props.images.length <= 3) return props.images.length;
  return 4;
});
const visibleImages = computed(() => props.images.slice(0, visibleLimit.value));
const hiddenCount = computed(() => Math.max(0, props.images.length - visibleImages.value.length));
const gridClass = computed(() => `count-${Math.min(props.images.length, 4)}`);

function openPreview(index: number) {
  previewIndex.value = index;
  previewVisible.value = true;
}

function closePreview() {
  previewVisible.value = false;
}

function movePreview(direction: 1 | -1) {
  const total = props.images.length;
  previewIndex.value = (previewIndex.value + direction + total) % total;
}
</script>

<style scoped>
.image-grid {
  display: grid;
  gap: 8px;
}

.image-grid.count-1 {
  grid-template-columns: minmax(0, 1fr);
}

.image-grid.count-2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.image-grid.count-3 {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.image-grid.count-4 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.image-tile {
  position: relative;
  overflow: hidden;
  border: 0;
  border-radius: 8px;
  padding: 0;
  background: var(--color-bg-muted);
  cursor: zoom-in;
}

.image-grid.count-1 .image-tile {
  aspect-ratio: 16 / 9;
}

.image-grid.count-2 .image-tile,
.image-grid.count-3 .image-tile,
.image-grid.count-4 .image-tile {
  aspect-ratio: 1 / 1;
}

.image-tile img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 260ms cubic-bezier(0.16, 1, 0.3, 1);
}

.image-tile:hover img {
  transform: scale(1.025);
}

.image-more {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(15, 23, 42, 0.58);
  color: #ffffff;
  font-size: 22px;
  font-weight: 900;
}

.preview-mask {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  place-items: center;
  padding: 48px;
  background: rgba(15, 23, 42, 0.82);
}

.preview-image {
  max-width: min(1080px, 92vw);
  max-height: 82dvh;
  border-radius: 12px;
  object-fit: contain;
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.34);
}

.preview-close,
.preview-nav {
  position: fixed;
  display: grid;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
  color: #ffffff;
  cursor: pointer;
  font-weight: 900;
  backdrop-filter: blur(14px);
  transition: background var(--gl-transition), transform var(--gl-transition);
}

.preview-close:hover,
.preview-nav:hover {
  background: rgba(255, 255, 255, 0.2);
}

.preview-close:active,
.preview-nav:active {
  transform: translateY(1px) scale(0.96);
}

.preview-close {
  top: 24px;
  right: 24px;
  width: 38px;
  height: 38px;
}

.preview-nav {
  top: 50%;
  width: 42px;
  height: 42px;
  font-size: 24px;
}

.preview-nav.prev {
  left: 24px;
}

.preview-nav.next {
  right: 24px;
}

@media (max-width: 560px) {
  .image-grid.count-2,
  .image-grid.count-3,
  .image-grid.count-4 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .preview-mask {
    padding: 18px;
  }
}
</style>
