<template>
  <div class="shell" :class="theme.className">
    <AppHeader />
    <main class="content">
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
  --theme-accent: #2563eb;
  --theme-accent-2: #14b8a6;
  --theme-accent-3: #f59e0b;
  --theme-text: #111827;
  --theme-soft: rgba(37, 99, 235, 0.08);
  --theme-soft-strong: rgba(37, 99, 235, 0.18);
  --theme-page-bg:
    radial-gradient(circle at 4% 8%, rgba(37, 99, 235, 0.12), transparent 28%),
    linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%);
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

.theme-entertainment {
  --theme-accent: #ec4899;
  --theme-accent-2: #f97316;
  --theme-accent-3: #facc15;
  --theme-soft: rgba(236, 72, 153, 0.1);
  --theme-soft-strong: rgba(236, 72, 153, 0.24);
  --theme-page-bg:
    radial-gradient(circle at 8% 10%, rgba(236, 72, 153, 0.16), transparent 26%),
    radial-gradient(circle at 92% 18%, rgba(249, 115, 22, 0.12), transparent 26%),
    linear-gradient(180deg, #fff7fb 0%, #fff7ed 100%);
  --theme-header-overlay:
    linear-gradient(110deg, rgba(131, 24, 67, 0.86), rgba(249, 115, 22, 0.48)),
    linear-gradient(180deg, rgba(0, 0, 0, 0.12), rgba(0, 0, 0, 0.28));
}

.theme-study {
  --theme-accent: #059669;
  --theme-accent-2: #2563eb;
  --theme-accent-3: #84cc16;
  --theme-soft: rgba(5, 150, 105, 0.1);
  --theme-soft-strong: rgba(5, 150, 105, 0.22);
  --theme-page-bg:
    radial-gradient(circle at 8% 12%, rgba(16, 185, 129, 0.14), transparent 28%),
    radial-gradient(circle at 90% 8%, rgba(37, 99, 235, 0.1), transparent 24%),
    linear-gradient(180deg, #f0fdf4 0%, #ecfeff 100%);
  --theme-header-overlay:
    linear-gradient(110deg, rgba(6, 78, 59, 0.88), rgba(37, 99, 235, 0.42)),
    linear-gradient(180deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.26));
}

.theme-game {
  --theme-accent: #7c3aed;
  --theme-accent-2: #06b6d4;
  --theme-accent-3: #f97316;
  --theme-soft: rgba(124, 58, 237, 0.1);
  --theme-soft-strong: rgba(124, 58, 237, 0.24);
  --theme-page-bg:
    radial-gradient(circle at 12% 10%, rgba(124, 58, 237, 0.16), transparent 28%),
    radial-gradient(circle at 90% 12%, rgba(6, 182, 212, 0.16), transparent 28%),
    linear-gradient(180deg, #f5f3ff 0%, #ecfeff 100%);
  --theme-header-overlay:
    linear-gradient(110deg, rgba(59, 7, 100, 0.88), rgba(6, 182, 212, 0.5)),
    linear-gradient(180deg, rgba(0, 0, 0, 0.14), rgba(0, 0, 0, 0.3));
}

.theme-tech {
  --theme-accent: #0f766e;
  --theme-accent-2: #4f46e5;
  --theme-accent-3: #22c55e;
  --theme-soft: rgba(15, 118, 110, 0.1);
  --theme-soft-strong: rgba(15, 118, 110, 0.22);
  --theme-page-bg:
    radial-gradient(circle at 7% 10%, rgba(20, 184, 166, 0.14), transparent 28%),
    linear-gradient(180deg, #f0fdfa 0%, #eef2ff 100%);
  --theme-header-overlay:
    linear-gradient(110deg, rgba(19, 78, 74, 0.88), rgba(79, 70, 229, 0.42)),
    linear-gradient(180deg, rgba(0, 0, 0, 0.12), rgba(0, 0, 0, 0.28));
}

.theme-live {
  --theme-accent: #dc2626;
  --theme-accent-2: #f59e0b;
  --theme-accent-3: #fb7185;
  --theme-soft: rgba(220, 38, 38, 0.1);
  --theme-soft-strong: rgba(220, 38, 38, 0.24);
  --theme-page-bg:
    radial-gradient(circle at 10% 10%, rgba(220, 38, 38, 0.14), transparent 28%),
    radial-gradient(circle at 90% 16%, rgba(245, 158, 11, 0.12), transparent 26%),
    linear-gradient(180deg, #fff1f2 0%, #fffbeb 100%);
  --theme-header-overlay:
    linear-gradient(110deg, rgba(127, 29, 29, 0.9), rgba(245, 158, 11, 0.42)),
    linear-gradient(180deg, rgba(0, 0, 0, 0.14), rgba(0, 0, 0, 0.32));
}
</style>
