<template>
  <div class="shell" :class="[theme.className, { 'shell--home': route.name === 'home', 'shell--video-detail': route.name === 'video-detail' }]">
    <AppHeader />
    <main
      class="content"
      :class="{
        'content--home': route.name === 'home',
        'content--video-detail': route.name === 'video-detail',
        'content--dynamic': route.name === 'notifications',
        'content--live': route.name === 'live-room',
        'content--dashboard': route.name === 'user-dashboard',
      }"
    >
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

import AppHeader from '@/components/AppHeader.vue';
import { resolveSectionTheme } from '@/utils/sectionThemes';

const route = useRoute();
const theme = computed(() => resolveSectionTheme(route));
</script>

<style scoped>
.shell {
  min-height: 100vh;
  --theme-accent: var(--color-primary);
  --theme-accent-2: var(--color-primary);
  --theme-accent-3: var(--color-warning);
  --theme-text: var(--color-text-main);
  --theme-soft: rgba(37, 99, 235, 0.08);
  --theme-soft-strong: rgba(37, 99, 235, 0.18);
  --theme-page-bg: var(--color-bg-page);
  --theme-title-gradient: linear-gradient(135deg, var(--theme-accent), var(--theme-accent-2));
  --theme-header-overlay:
    linear-gradient(110deg, rgba(15, 23, 42, 0.82), rgba(37, 99, 235, 0.5)),
    linear-gradient(180deg, rgba(0, 0, 0, 0.16), rgba(0, 0, 0, 0.34));
  background: var(--theme-page-bg);
  transition: background 0.25s ease;
}

.content {
  padding: 28px 32px;
  max-width: 1400px;
  margin: 0 auto;
}

.content--home {
  width: 100%;
  max-width: none;
  padding: 18px clamp(32px, 3.4vw, 48px) 34px;
}

.shell--home {
  --theme-accent: var(--color-primary);
  --theme-accent-2: var(--color-primary);
  --theme-page-bg: var(--color-bg-page);
}

.shell--video-detail {
  --theme-page-bg: var(--color-bg-page);
}

.content--video-detail {
  width: 100%;
  max-width: none;
  padding: 24px clamp(28px, 3.2vw, 56px) 38px;
  background: transparent;
}

.content--dynamic {
  width: 100%;
  max-width: none;
  padding: 28px clamp(28px, 4vw, 72px) 38px;
  background: transparent;
}

.content--live {
  width: 100%;
  max-width: none;
  padding: 24px clamp(28px, 4vw, 72px) 40px;
  background: transparent;
}

.content--dashboard {
  width: 100%;
  max-width: none;
  padding: 0 clamp(12px, 1.6vw, 24px);
}

@media (max-width: 760px) {
  .content--video-detail,
  .content--dynamic,
  .content--live {
    padding: 18px 16px 30px;
  }
}

.theme-entertainment {
  --theme-accent: var(--color-primary);
  --theme-accent-2: var(--color-primary);
  --theme-accent-3: var(--color-warning);
  --theme-soft: rgba(37, 99, 235, 0.08);
  --theme-soft-strong: rgba(37, 99, 235, 0.18);
  --theme-page-bg: var(--color-bg-page);
}

.theme-study {
  --theme-accent: var(--color-primary);
  --theme-accent-2: var(--color-primary);
  --theme-accent-3: var(--color-success);
  --theme-soft: rgba(37, 99, 235, 0.08);
  --theme-soft-strong: rgba(37, 99, 235, 0.18);
  --theme-page-bg: var(--color-bg-page);
}

.theme-game {
  --theme-accent: var(--color-primary);
  --theme-accent-2: var(--color-primary);
  --theme-accent-3: var(--color-warning);
  --theme-soft: rgba(37, 99, 235, 0.08);
  --theme-soft-strong: rgba(37, 99, 235, 0.18);
  --theme-page-bg: var(--color-bg-page);
}

.theme-tech {
  --theme-accent: var(--color-primary);
  --theme-accent-2: var(--color-primary);
  --theme-accent-3: var(--color-success);
  --theme-soft: rgba(37, 99, 235, 0.08);
  --theme-soft-strong: rgba(37, 99, 235, 0.18);
  --theme-page-bg: var(--color-bg-page);
}

.theme-live {
  --theme-accent: var(--color-primary);
  --theme-accent-2: var(--color-primary);
  --theme-accent-3: var(--color-danger);
  --theme-soft: rgba(37, 99, 235, 0.08);
  --theme-soft-strong: rgba(37, 99, 235, 0.16);
  --theme-page-bg: var(--color-bg-page);
}
</style>
