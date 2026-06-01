<template>
  <Teleport to="body">
    <div
      ref="buddyRef"
      class="assistant-buddy"
      :class="{ 'assistant-buddy--dragging': dragging, 'assistant-buddy--open': assistantStore.panelOpen }"
      :style="buddyStyle"
      aria-label="全站 AI 小助手"
      @pointerdown="handlePointerDown"
    >
      <button class="assistant-buddy__avatar" type="button">
        <img
          class="assistant-buddy__image"
          :src="buddyImageUrl"
          alt="澜澜 AI 小助手"
          @error="imageFailed = true"
          v-show="!imageFailed"
        />
        <span v-if="imageFailed" class="assistant-buddy__fallback" aria-hidden="true">
          <span class="assistant-buddy__face">
            <i></i>
            <i></i>
          </span>
        </span>
        <span v-if="assistantStore.thinking" class="assistant-buddy__thinking">···</span>
        <span v-else-if="assistantStore.unreadCount > 0" class="assistant-buddy__badge">{{ assistantStore.unreadCount }}</span>
      </button>
      <div v-if="!assistantStore.panelOpen" class="assistant-buddy__tip">和我聊聊？</div>
    </div>

    <AssistantPanel
      v-if="assistantStore.panelOpen"
      class="assistant-buddy__panel"
      :style="panelStyle"
      @close="assistantStore.closePanel"
      @send="sendMessage"
    />
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

import AssistantPanel from './AssistantPanel.vue';
import { useAssistantStore } from '@/stores/assistant';
import type { AssistantContext } from '@/api/assistant';

const BUDDY_SIZE = 96;
const PANEL_WIDTH = 380;
const PANEL_HEIGHT = 540;
const EDGE_GAP = 18;
const MOVE_THRESHOLD = 5;

const route = useRoute();
const assistantStore = useAssistantStore();
const buddyRef = ref<HTMLElement | null>(null);
const imageFailed = ref(false);
const buddyImageUrl = `${import.meta.env.BASE_URL}assistant/buddy.png`;
const dragging = ref(false);
const moved = ref(false);
const pointerId = ref<number | null>(null);
const position = ref({ x: 0, y: 0 });
const dragOffset = ref({ x: 0, y: 0 });
const startPoint = ref({ x: 0, y: 0 });

const buddyStyle = computed(() => ({
  transform: `translate3d(${position.value.x}px, ${position.value.y}px, 0)`,
}));

const panelStyle = computed(() => {
  const viewportWidth = window.innerWidth || 1200;
  const viewportHeight = window.innerHeight || 800;
  const placeLeft = position.value.x + BUDDY_SIZE + PANEL_WIDTH + EDGE_GAP > viewportWidth;
  const left = placeLeft
    ? Math.max(EDGE_GAP, position.value.x - PANEL_WIDTH - 12)
    : Math.min(viewportWidth - PANEL_WIDTH - EDGE_GAP, position.value.x + BUDDY_SIZE + 12);
  const top = Math.min(
    Math.max(EDGE_GAP, position.value.y - 24),
    Math.max(EDGE_GAP, viewportHeight - PANEL_HEIGHT - EDGE_GAP),
  );

  return {
    left: `${left}px`,
    top: `${top}px`,
  };
});

onMounted(() => {
  const saved = assistantStore.position;
  position.value = clampPosition(
    saved ?? {
      x: window.innerWidth - BUDDY_SIZE - 32,
      y: window.innerHeight - BUDDY_SIZE - 96,
    },
  );
  assistantStore.setPosition(position.value);
  window.addEventListener('resize', handleResize);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
  stopDragging();
});

function handlePointerDown(event: PointerEvent) {
  if (event.button !== 0) return;
  pointerId.value = event.pointerId;
  dragging.value = false;
  moved.value = false;
  startPoint.value = { x: event.clientX, y: event.clientY };
  dragOffset.value = {
    x: event.clientX - position.value.x,
    y: event.clientY - position.value.y,
  };
  buddyRef.value?.setPointerCapture(event.pointerId);
  window.addEventListener('pointermove', handlePointerMove);
  window.addEventListener('pointerup', handlePointerUp);
  window.addEventListener('pointercancel', handlePointerUp);
}

function handlePointerMove(event: PointerEvent) {
  if (pointerId.value !== event.pointerId) return;
  const distance = Math.hypot(event.clientX - startPoint.value.x, event.clientY - startPoint.value.y);
  if (distance <= MOVE_THRESHOLD && !moved.value) {
    return;
  }

  moved.value = true;
  dragging.value = true;
  position.value = clampPosition({
    x: event.clientX - dragOffset.value.x,
    y: event.clientY - dragOffset.value.y,
  });
}

function handlePointerUp(event: PointerEvent) {
  if (pointerId.value !== event.pointerId) return;
  buddyRef.value?.releasePointerCapture(event.pointerId);

  if (moved.value) {
    position.value = snapToEdge(position.value);
    assistantStore.setPosition(position.value);
  } else {
    assistantStore.togglePanel();
  }

  nextTick(() => {
    dragging.value = false;
  });
  stopDragging();
}

function stopDragging() {
  window.removeEventListener('pointermove', handlePointerMove);
  window.removeEventListener('pointerup', handlePointerUp);
  window.removeEventListener('pointercancel', handlePointerUp);
  pointerId.value = null;
}


function handleResize() {
  position.value = clampPosition(position.value);
  assistantStore.setPosition(position.value);
}

function clampPosition(nextPosition: { x: number; y: number }) {
  const maxX = Math.max(EDGE_GAP, window.innerWidth - BUDDY_SIZE - EDGE_GAP);
  const maxY = Math.max(EDGE_GAP, window.innerHeight - BUDDY_SIZE - EDGE_GAP);
  return {
    x: Math.min(Math.max(EDGE_GAP, nextPosition.x), maxX),
    y: Math.min(Math.max(EDGE_GAP, nextPosition.y), maxY),
  };
}

function snapToEdge(nextPosition: { x: number; y: number }) {
  const clamped = clampPosition(nextPosition);
  const midpoint = window.innerWidth / 2;
  return {
    x: clamped.x + BUDDY_SIZE / 2 < midpoint ? EDGE_GAP : window.innerWidth - BUDDY_SIZE - EDGE_GAP,
    y: clamped.y,
  };
}

function buildContext(): AssistantContext {
  const routeName = String(route.name ?? '');
  return {
    path: route.fullPath,
    routeName,
    videoId: routeName === 'video-detail' ? Number(route.params.id) : undefined,
    category: routeName.startsWith('category-') ? routeName.replace('category-', '') : undefined,
    keyword: routeName === 'search' ? String(route.query.keyword ?? route.query.q ?? '') : undefined,
  };
}

function sendMessage(content: string) {
  void assistantStore.sendMessage(content, buildContext());
}
</script>

<style scoped>
.assistant-buddy {
  position: fixed;
  left: 0;
  top: 0;
  z-index: 5000;
  width: 96px;
  user-select: none;
  touch-action: none;
  cursor: grab;
  transition: transform 220ms cubic-bezier(0.16, 1, 0.3, 1);
}

.assistant-buddy--dragging {
  cursor: grabbing;
  transition: none;
}

.assistant-buddy__avatar {
  position: relative;
  display: grid;
  place-items: center;
  width: 96px;
  height: 96px;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  cursor: inherit;
  overflow: visible;
}

.assistant-buddy__image {
  width: 96px;
  height: 96px;
  object-fit: contain;
  pointer-events: none;
  filter: drop-shadow(0 12px 18px rgba(15, 23, 42, 0.16));
  transform: scale(3);
  transform-origin: center;
}

.assistant-buddy__fallback {
  display: grid;
  place-items: center;
  width: 54px;
  height: 48px;
  border-radius: 20px 20px 16px 16px;
  background: linear-gradient(180deg, #ffffff, #dbeafe);
  border: 2px solid rgba(37, 99, 235, 0.26);
}

.assistant-buddy__face {
  position: relative;
  display: flex;
  gap: 12px;
}

.assistant-buddy__face::before {
  position: absolute;
  left: 50%;
  top: -14px;
  width: 2px;
  height: 11px;
  content: '';
  background: #2563eb;
  transform: translateX(-50%);
}

.assistant-buddy__face::after {
  position: absolute;
  left: 50%;
  top: -20px;
  width: 8px;
  height: 8px;
  content: '';
  border-radius: 50%;
  background: #f59e0b;
  transform: translateX(-50%);
}

.assistant-buddy__face i {
  width: 8px;
  height: 11px;
  border-radius: 999px;
  background: #2563eb;
  box-shadow: 0 0 10px rgba(37, 99, 235, 0.55);
}

.assistant-buddy__thinking,
.assistant-buddy__badge {
  position: absolute;
  right: -3px;
  top: -5px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding: 0 6px;
  border: 2px solid #fff;
  border-radius: 999px;
  background: #ef4444;
  color: #fff;
  font-size: 12px;
  font-weight: 800;
}

.assistant-buddy__thinking {
  background: #2563eb;
  letter-spacing: 1px;
}

.assistant-buddy__tip {
  position: absolute;
  right: 88px;
  top: 10px;
  width: max-content;
  max-width: 150px;
  padding: 8px 12px;
  border: 1px solid rgba(37, 99, 235, 0.12);
  border-radius: 999px 999px 8px 999px;
  background: rgba(255, 255, 255, 0.96);
  color: #2563eb;
  font-size: 13px;
  font-weight: 800;
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.1);
  pointer-events: none;
}

.assistant-buddy__panel {
  position: fixed;
  z-index: 4999;
}

@media (max-width: 720px) {
  .assistant-buddy {
    width: 78px;
  }

  .assistant-buddy__avatar {
    width: 78px;
    height: 78px;
  }

  .assistant-buddy__image {
    width: 78px;
    height: 78px;
    transform: scale(1.65);
  }

  .assistant-buddy__tip {
    display: none;
  }
}
</style>



