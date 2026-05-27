<template>
  <section class="empty-state">
    <div class="mark" aria-hidden="true">
      <span></span>
    </div>
    <div>
      <h3>{{ title }}</h3>
      <p>{{ description }}</p>
    </div>
    <div v-if="$slots.action" class="action">
      <slot name="action" />
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
  description: string;
}>();
</script>

<style scoped>
.empty-state {
  display: grid;
  justify-items: center;
  gap: 14px;
  grid-column: 1 / -1;
  padding: 42px 24px;
  border: 1px dashed var(--gl-border);
  border-radius: var(--gl-radius-panel);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.78), rgba(238, 243, 248, 0.72));
  color: var(--gl-text-secondary);
  text-align: center;
}

.mark {
  display: grid;
  place-items: center;
  width: 54px;
  height: 54px;
  border-radius: 18px;
  background: var(--gl-primary-soft);
}

.mark span {
  width: 24px;
  height: 18px;
  border: 2px solid var(--gl-primary);
  border-radius: 6px;
  box-shadow: inset 0 -6px 0 rgba(47, 79, 143, 0.12);
}

h3 {
  margin: 0;
  color: var(--gl-text-primary);
  font-size: 17px;
  line-height: 24px;
}

p {
  max-width: 42ch;
  margin: 6px 0 0;
  color: var(--gl-text-secondary);
  font-size: 14px;
  line-height: 22px;
}

.action {
  display: flex;
  justify-content: center;
}
</style>
