<template>
  <component :is="to ? RouterLink : 'div'" :to="to" class="feature-entry">
    <span class="feature-icon" :class="tone" aria-hidden="true">
      <el-icon :size="22">
        <component :is="icon" />
      </el-icon>
    </span>
    <span class="feature-copy">
      <strong>{{ title }}</strong>
      <small>{{ description }}</small>
    </span>
  </component>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router';

defineProps<{
  title: string;
  description: string;
  to?: string;
  icon: object;
  tone?: 'primary' | 'accent' | 'live' | 'neutral';
}>();
</script>

<style scoped>
.feature-entry {
  display: flex;
  align-items: center;
  gap: 13px;
  min-width: 0;
  padding: 18px 20px;
  border: 1px solid rgba(221, 229, 239, 0.82);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 10px 26px rgba(47, 79, 143, 0.06);
  color: inherit;
  text-decoration: none;
  transition:
    transform var(--gl-transition),
    box-shadow var(--gl-transition),
    border-color var(--gl-transition),
    background-color var(--gl-transition);
}

.feature-entry:hover {
  transform: translateY(-3px);
  border-color: rgba(47, 79, 143, 0.24);
  box-shadow: 0 18px 34px rgba(47, 79, 143, 0.11);
}

.feature-entry:active {
  transform: translateY(-1px) scale(0.99);
}

.feature-icon {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: var(--gl-primary-soft);
  color: var(--gl-primary);
}

.feature-icon.accent {
  background: var(--gl-accent-soft);
  color: #9a611c;
}

.feature-icon.live {
  background: rgba(228, 61, 79, 0.1);
  color: var(--gl-live-red);
}

.feature-icon.neutral {
  background: var(--gl-surface-soft);
  color: var(--gl-text-secondary);
}

.feature-copy {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.feature-copy strong {
  overflow: hidden;
  color: var(--gl-text-primary);
  font-size: 15px;
  font-weight: 700;
  line-height: 22px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.feature-copy small {
  overflow: hidden;
  color: var(--gl-text-muted);
  font-size: 12px;
  font-weight: 500;
  line-height: 18px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
