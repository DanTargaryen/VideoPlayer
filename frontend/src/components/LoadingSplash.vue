<template>
  <div class="loading-splash" :class="{ 'loading-splash-full': fullPage }">
    <div class="loading-splash-card">
      <img class="loading-splash-logo" src="/assets/guanlan-loading.png" alt="观澜视频加载中" />
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    fullPage?: boolean;
  }>(),
  {
    fullPage: false,
  },
);
</script>

<style scoped>
.loading-splash {
  display: grid;
  place-items: center;
  min-height: 420px;
  padding: 24px;
  background: #ffffff;
}

.loading-splash-full {
  position: fixed;
  inset: 0;
  z-index: 9999;
  min-height: 100vh;
  padding: 0;
  background: #ffffff;
}

.loading-splash-card {
  display: grid;
  justify-items: center;
  gap: 0;
}

.loading-splash-logo {
  width: min(720px, 78vw);
  max-width: 100%;
  object-fit: contain;
  user-select: none;
  pointer-events: none;
}
</style>
