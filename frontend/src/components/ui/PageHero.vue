<template>
  <section class="page-hero" :class="{ compact }">
    <div class="copy">
      <p v-if="eyebrow" class="eyebrow">{{ eyebrow }}</p>
      <h1>{{ title }}</h1>
      <p v-if="description" class="description">{{ description }}</p>
      <div v-if="$slots.actions" class="actions">
        <slot name="actions" />
      </div>
    </div>
    <div v-if="$slots.aside" class="aside">
      <slot name="aside" />
    </div>
  </section>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string;
    description?: string;
    eyebrow?: string;
    compact?: boolean;
  }>(),
  {
    compact: false,
  },
);
</script>

<style scoped>
.page-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(280px, 0.85fr);
  gap: 28px;
  align-items: stretch;
  padding: 30px;
  border: 1px solid var(--gl-border);
  border-radius: 24px;
  background:
    radial-gradient(circle at top left, rgba(47, 79, 143, 0.1), transparent 32%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(238, 243, 248, 0.92));
  box-shadow: var(--gl-shadow-card);
}

.page-hero.compact {
  grid-template-columns: 1fr auto;
  padding: 24px;
}

.copy {
  display: grid;
  align-content: center;
  gap: 14px;
  min-width: 0;
}

.eyebrow {
  width: fit-content;
  margin: 0;
  padding: 6px 10px;
  border-radius: 10px;
  background: var(--gl-accent-soft);
  color: #9A611C;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
}

h1 {
  margin: 0;
  color: var(--gl-text-primary);
  font-size: 32px;
  line-height: 40px;
  font-weight: 800;
  text-wrap: balance;
}

.description {
  max-width: 64ch;
  margin: 0;
  color: var(--gl-text-secondary);
  font-size: 15px;
  line-height: 24px;
}

.actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 2px;
}

.aside {
  min-width: 0;
}

@media (max-width: 820px) {
  .page-hero,
  .page-hero.compact {
    grid-template-columns: 1fr;
    padding: 22px;
  }

  h1 {
    font-size: 28px;
    line-height: 36px;
  }
}
</style>
