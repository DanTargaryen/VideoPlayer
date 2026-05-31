<template>
  <nav
    ref="floatingActionsRef"
    class="floating-actions"
    :class="{ 'is-dragging': dragging }"
    :style="floatingStyle"
    aria-label="动态页快捷操作"
    @click.capture="handleCapturedClick"
    @pointerdown="handlePointerDown"
  >
    <button type="button" aria-label="回到顶部" title="回到顶部" @click="scrollToTop">
      <el-icon><Top /></el-icon>
    </button>
    <button type="button" aria-label="反馈建议" title="反馈建议" @click="openFeedback">
      <el-icon><ChatDotRound /></el-icon>
    </button>
    <button type="button" aria-label="发布动态" title="发布动态" @click="$emit('compose')">
      <el-icon><EditPen /></el-icon>
    </button>
  </nav>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { ChatDotRound, EditPen, Top } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';

defineEmits<{
  compose: [];
}>();

const POSITION_STORAGE_KEY = 'vp_dynamic_floating_actions_top';
const DEFAULT_BOTTOM_OFFSET = 84;
const VIEWPORT_EDGE_GAP = 14;
const DRAG_THRESHOLD = 5;
const floatingActionsRef = ref<HTMLElement | null>(null);
const topPosition = ref<number | null>(null);
const dragging = ref(false);

let activePointerId: number | null = null;
let startY = 0;
let startTop = 0;
let hasDragged = false;
let suppressClickUntil = 0;

const floatingStyle = computed(() => {
  if (topPosition.value === null) {
    return {};
  }

  return {
    top: `${topPosition.value}px`,
    bottom: 'auto',
  };
});

function getFloatingHeight() {
  return floatingActionsRef.value?.offsetHeight ?? 58;
}

function clampTopPosition(value: number) {
  const maxTop = Math.max(VIEWPORT_EDGE_GAP, window.innerHeight - getFloatingHeight() - VIEWPORT_EDGE_GAP);
  return Math.min(Math.max(value, VIEWPORT_EDGE_GAP), maxTop);
}

function readStoredTopPosition() {
  try {
    const stored = Number(localStorage.getItem(POSITION_STORAGE_KEY));
    return Number.isFinite(stored) ? stored : null;
  } catch {
    return null;
  }
}

function saveTopPosition() {
  if (topPosition.value === null) {
    return;
  }

  try {
    localStorage.setItem(POSITION_STORAGE_KEY, String(Math.round(topPosition.value)));
  } catch {
    // Ignore storage failures so dragging still works in restricted contexts.
  }
}

function getDefaultTopPosition() {
  return window.innerHeight - getFloatingHeight() - DEFAULT_BOTTOM_OFFSET;
}

function syncInitialPosition() {
  const storedTop = readStoredTopPosition();
  topPosition.value = clampTopPosition(storedTop ?? getDefaultTopPosition());
}

function handleResize() {
  if (topPosition.value === null) {
    syncInitialPosition();
    return;
  }

  topPosition.value = clampTopPosition(topPosition.value);
  saveTopPosition();
}

function removePointerListeners() {
  window.removeEventListener('pointermove', handlePointerMove);
  window.removeEventListener('pointerup', handlePointerEnd);
  window.removeEventListener('pointercancel', handlePointerEnd);
}

function handlePointerDown(event: PointerEvent) {
  if (event.pointerType === 'mouse' && event.button !== 0) {
    return;
  }

  const element = floatingActionsRef.value;
  if (!element) {
    return;
  }

  activePointerId = event.pointerId;
  startY = event.clientY;
  startTop = topPosition.value ?? element.getBoundingClientRect().top;
  hasDragged = false;
  dragging.value = false;
  try {
    element.setPointerCapture(event.pointerId);
  } catch {
    // Window-level listeners still keep the vertical drag working if capture is unavailable.
  }
  window.addEventListener('pointermove', handlePointerMove, { passive: false });
  window.addEventListener('pointerup', handlePointerEnd);
  window.addEventListener('pointercancel', handlePointerEnd);
}

function handlePointerMove(event: PointerEvent) {
  if (activePointerId !== event.pointerId) {
    return;
  }

  const deltaY = event.clientY - startY;
  if (!hasDragged && Math.abs(deltaY) < DRAG_THRESHOLD) {
    return;
  }

  event.preventDefault();
  hasDragged = true;
  dragging.value = true;
  topPosition.value = clampTopPosition(startTop + deltaY);
}

function handlePointerEnd(event: PointerEvent) {
  if (activePointerId !== event.pointerId) {
    return;
  }

  const pointerId = activePointerId;
  activePointerId = null;
  removePointerListeners();

  try {
    floatingActionsRef.value?.releasePointerCapture(pointerId);
  } catch {
    // The browser may release capture automatically when the pointer is canceled.
  }

  if (hasDragged) {
    saveTopPosition();
    suppressClickUntil = Date.now() + 160;
  }

  dragging.value = false;
  hasDragged = false;
}

function handleCapturedClick(event: MouseEvent) {
  if (Date.now() <= suppressClickUntil) {
    event.preventDefault();
    event.stopPropagation();
  }
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openFeedback() {
  ElMessage.info('反馈入口正在建设中');
}

onMounted(() => {
  void nextTick(syncInitialPosition);
  window.addEventListener('resize', handleResize);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
  removePointerListeners();
});
</script>

<style scoped>
.floating-actions {
  position: fixed;
  right: clamp(14px, 1.6vw, 28px);
  bottom: 84px;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 4px;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 16px 34px rgba(15, 23, 42, 0.12);
  backdrop-filter: blur(12px);
  cursor: grab;
  padding: 6px;
  touch-action: none;
  user-select: none;
}

.floating-actions button {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: background var(--gl-transition), color var(--gl-transition), transform var(--gl-transition);
}

.floating-actions.is-dragging,
.floating-actions.is-dragging button {
  cursor: grabbing;
}

.floating-actions button:hover {
  background: var(--color-primary-light);
  color: var(--color-primary);
}

.floating-actions button:active {
  transform: translateY(1px) scale(0.98);
}

@media (max-width: 980px) {
  .floating-actions {
    display: none;
  }
}
</style>
