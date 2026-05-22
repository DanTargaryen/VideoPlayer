<template>
  <section class="form-panel">
    <div v-if="title || description || eyebrow" class="head">
      <p v-if="eyebrow" class="eyebrow">{{ eyebrow }}</p>
      <h1 v-if="title">{{ title }}</h1>
      <p v-if="description" class="description">{{ description }}</p>
    </div>
    <slot />
  </section>
</template>

<script setup lang="ts">
defineProps<{
  title?: string;
  description?: string;
  eyebrow?: string;
}>();
</script>

<style scoped>
.form-panel {
  width: 100%;
  padding: 30px;
  border: 1px solid var(--gl-border);
  border-radius: 22px;
  background: var(--gl-surface);
  box-shadow: var(--gl-shadow-soft);
}

.head {
  margin-bottom: 20px;
}

.eyebrow {
  margin: 0 0 8px;
  color: var(--gl-accent);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
}

h1 {
  margin: 0;
  color: var(--gl-text-primary);
  font-size: 30px;
  line-height: 38px;
}

.description {
  margin: 8px 0 0;
  color: var(--gl-text-secondary);
  font-size: 14px;
  line-height: 22px;
}

@media (max-width: 640px) {
  .form-panel {
    padding: 22px;
  }
}
</style>
