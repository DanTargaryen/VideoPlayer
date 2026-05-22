<template>
  <article class="stat-card">
    <span class="label">{{ label }}</span>
    <strong>{{ value }}</strong>
    <p v-if="description">{{ description }}</p>
  </article>
</template>

<script setup lang="ts">
defineProps<{
  label: string;
  value: string | number;
  description?: string;
}>();
</script>

<style scoped>
.stat-card {
  min-width: 0;
  padding: 18px 20px;
  border: 1px solid var(--gl-border);
  border-radius: 16px;
  background: var(--gl-surface);
  box-shadow: 0 8px 22px rgba(47, 79, 143, 0.05);
}

.label {
  display: block;
  color: var(--gl-text-muted);
  font-size: 12px;
  font-weight: 600;
  line-height: 18px;
}

strong {
  display: block;
  margin-top: 8px;
  color: var(--gl-text-primary);
  font-size: 28px;
  line-height: 34px;
  font-variant-numeric: tabular-nums;
}

p {
  margin: 6px 0 0;
  color: var(--gl-text-secondary);
  font-size: 13px;
  line-height: 20px;
}
</style>
