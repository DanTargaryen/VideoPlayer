<template>
  <header class="section-header">
    <div class="copy">
      <p v-if="eyebrow" class="eyebrow">{{ eyebrow }}</p>
      <h2>{{ title }}</h2>
      <p v-if="description" class="description">{{ description }}</p>
    </div>
    <div v-if="$slots.actions" class="actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
  description?: string;
  eyebrow?: string;
}>();
</script>

<style scoped>
.section-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  padding-top: 2px;
}

.copy {
  position: relative;
  min-width: 0;
  padding-left: 16px;
}

.copy::before {
  position: absolute;
  left: 0;
  top: 6px;
  width: 4px;
  height: 24px;
  border-radius: 99px;
  background: var(--gl-primary);
  content: "";
}

.eyebrow {
  margin: 0 0 8px;
  color: var(--gl-accent);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

h2 {
  margin: 0;
  color: var(--gl-text-primary);
  font-size: 22px;
  line-height: 30px;
  font-weight: 700;
  text-wrap: balance;
}

.description {
  max-width: 64ch;
  margin: 6px 0 0;
  color: var(--gl-text-secondary);
  font-size: 14px;
  line-height: 22px;
}

.actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}

@media (max-width: 720px) {
  .section-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .actions {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>
