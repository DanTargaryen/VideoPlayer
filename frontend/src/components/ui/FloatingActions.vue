<template>
  <aside class="floating-actions" aria-label="快捷操作">
    <slot />
  </aside>
</template>

<style scoped>
.floating-actions {
  position: fixed;
  right: max(18px, env(safe-area-inset-right));
  bottom: max(22px, env(safe-area-inset-bottom));
  z-index: 20;
  display: grid;
  gap: 10px;
}

.floating-actions :deep(a),
.floating-actions :deep(button) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 46px;
  min-height: 46px;
  border: 1px solid var(--gl-border);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.96);
  color: var(--gl-text-secondary);
  box-shadow: 0 12px 26px rgba(47, 79, 143, 0.1);
  transition:
    transform var(--gl-transition),
    color var(--gl-transition),
    border-color var(--gl-transition),
    background-color var(--gl-transition);
}

.floating-actions :deep(a:hover),
.floating-actions :deep(button:hover) {
  transform: translateY(-3px);
  border-color: rgba(47, 79, 143, 0.24);
  background: var(--gl-primary-soft);
  color: var(--gl-primary);
}

@media (max-width: 720px) {
  .floating-actions {
    right: 12px;
    bottom: 14px;
  }
}
</style>
