<template>
  <div class="app-shell">
    <AppHeader />
    <main id="main-content" class="app-shell-content" :class="`app-shell-content-${mode}`">
      <slot />
    </main>
    <slot name="floating-actions" />
  </div>
</template>

<script setup lang="ts">
import AppHeader from '@/components/AppHeader.vue';

withDefaults(
  defineProps<{
    mode?: 'default' | 'wide' | 'media' | 'auth';
  }>(),
  {
    mode: 'default',
  },
);
</script>

<style scoped>
.app-shell {
  min-height: 100dvh;
  background: var(--gl-background);
}

.app-shell-content {
  width: 100%;
  margin: 0 auto;
  padding: 28px 32px 56px;
}

.app-shell-content-default {
  max-width: var(--gl-container-default);
}

.app-shell-content-wide,
.app-shell-content-media {
  max-width: var(--gl-container-wide);
}

.app-shell-content-auth {
  max-width: var(--gl-container-auth);
}

@media (max-width: 720px) {
  .app-shell-content {
    padding: 20px 16px 40px;
  }
}
</style>
