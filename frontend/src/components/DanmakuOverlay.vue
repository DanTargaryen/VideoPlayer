<template>
  <div class="danmaku-overlay" ref="overlayRef" @click.self="$emit('overlay-click')" v-show="props.visible !== false">
    <div
      v-for="item in activeDanmakus"
      :key="item.trackKey"
      class="danmaku-item"
      :class="{
        'danmaku-paused': props.paused || hoveredTrackKey === item.trackKey,
        'danmaku-self': item.raw.user.id === props.currentUserId,
      }"
      :style="item.style"
      @mouseenter="handleDanmakuHover($event, item)"
      @mouseleave="handleDanmakuLeave"
      @click.stop="handleDanmakuClick($event, item.raw)"
    >
      {{ item.raw.content }}
    </div>

    <div
      v-if="contextMenu.visible"
      class="danmaku-context-menu"
      :class="{ 'context-menu-hovered': contextMenuHovered }"
      :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }"
      @mouseenter="handleContextMenuEnter"
      @mouseleave="handleContextMenuLeave"
    >
      <template v-if="contextMenu.danmaku && contextMenu.danmaku.user.id === props.currentUserId">
        <button class="ctx-btn" :class="{ liked: contextMenu.liked }" @click.stop="handleLike" title="点赞">
          <svg class="ctx-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M7 22V11L10.5 3.5C10.78 2.87 11.41 2.5 12.1 2.5C13.1 2.5 13.85 3.42 13.65 4.4L12.8 9H20c1.1 0 2 0.9 2 2v1c0 .15-.02.3-.05.44l-2.19 8C19.5 21.35 18.68 22 17.73 22H7ZM7 13v8M3 22h2V11H3v11Z" fill="currentColor"/>
          </svg>
        </button>
        <button class="ctx-btn" @click.stop="handleCopy" title="复制">
          <svg class="ctx-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1Zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2Zm0 16H8V7h11v14Z" fill="currentColor"/>
          </svg>
        </button>
        <button class="ctx-btn delete" @click.stop="handleDelete" title="删除">
          <svg class="ctx-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12ZM8 9h8v10H8V9Zm7.5-5-1-1h-5l-1 1H5v2h14V4h-3.5Z" fill="currentColor"/>
          </svg>
        </button>
      </template>
      <template v-else>
        <button class="ctx-btn" :class="{ liked: contextMenu.liked }" @click.stop="handleLike" title="点赞">
          <svg class="ctx-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M7 22V11L10.5 3.5C10.78 2.87 11.41 2.5 12.1 2.5C13.1 2.5 13.85 3.42 13.65 4.4L12.8 9H20c1.1 0 2 0.9 2 2v1c0 .15-.02.3-.05.44l-2.19 8C19.5 21.35 18.68 22 17.73 22H7ZM7 13v8M3 22h2V11H3v11Z" fill="currentColor"/>
          </svg>
        </button>
        <button class="ctx-btn" @click.stop="handleCopy" title="复制">
          <svg class="ctx-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1Zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2Zm0 16H8V7h11v14Z" fill="currentColor"/>
          </svg>
        </button>
        <button class="ctx-btn report" @click.stop="handleReport" title="举报">
          <svg class="ctx-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Zm1 15h-2v-2h2v2Zm0-4h-2V7h2v6Z" fill="currentColor"/>
          </svg>
        </button>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch, onMounted, onUnmounted } from 'vue';
import type { DanmakuItem } from '@/types/api';

const props = defineProps<{
  danmakus: DanmakuItem[];
  currentTimeMs: number;
  durationMs: number;
  visible?: boolean;
  paused?: boolean;
  likedIds?: Set<number>;
  currentUserId?: number;
}>();

const emit = defineEmits<{
  (e: 'report', danmaku: DanmakuItem): void;
  (e: 'like', danmaku: DanmakuItem): void;
  (e: 'delete', danmaku: DanmakuItem): void;
  (e: 'overlay-click'): void;
}>();

const overlayRef = ref<HTMLElement | null>(null);

const contextMenu = reactive({
  visible: false,
  x: 0,
  y: 0,
  danmaku: null as DanmakuItem | null,
  liked: false,
});

const hoveredTrackKey = ref<string | null>(null);
const contextMenuHovered = ref(false);
let leaveTimer: ReturnType<typeof setTimeout> | null = null;

const WINDOW_MS = 500;

const trackCount = 8;

const trackLastEnd = ref<number[]>(new Array(trackCount).fill(-Infinity));

interface ActiveDanmaku {
  trackKey: string;
  raw: DanmakuItem;
  createdAt: number;
  lifetimeMs: number;
  style: {
    top: string;
    color: string;
    animationDuration: string;
    animationDelay: string;
  };
}

const activeDanmakus = ref<ActiveDanmaku[]>([]);

const ANIMATION_DURATION_S = 14;

const sortedDanmakus = computed(() =>
  [...props.danmakus].sort((a, b) => a.timeOffsetMs - b.timeOffsetMs),
);

let lastProcessedIndex = 0;
let lastTimeMs = 0;
const pendingTimers: ReturnType<typeof setTimeout>[] = [];

function resetState() {
  if (leaveTimer) {
    clearTimeout(leaveTimer);
    leaveTimer = null;
  }
  clearAllTimers();
  lastProcessedIndex = 0;
  lastTimeMs = 0;
  activeDanmakus.value = [];
  trackLastEnd.value = new Array(trackCount).fill(-Infinity);
}

function scheduleCleanup(item: ActiveDanmaku) {
  if (props.paused) return;
  const remaining = item.createdAt + item.lifetimeMs - Date.now();
  if (remaining <= 0) {
    activeDanmakus.value = activeDanmakus.value.filter((a) => a.trackKey !== item.trackKey);
    return;
  }
  const timer = setTimeout(() => {
    activeDanmakus.value = activeDanmakus.value.filter(
      (a) => a.trackKey !== item.trackKey,
    );
    const idx = pendingTimers.indexOf(timer);
    if (idx !== -1) pendingTimers.splice(idx, 1);
  }, remaining);
  pendingTimers.push(timer);
}

function addSingleDanmaku(d: DanmakuItem) {
  if (activeDanmakus.value.some((a) => a.raw.id === d.id)) return;

  const currentMs = props.currentTimeMs;
  if (d.timeOffsetMs < currentMs - 100 || d.timeOffsetMs > currentMs + WINDOW_MS) return;

  const trackIndex = findAvailableTrack(d.timeOffsetMs);
  if (trackIndex === -1) return;

  const delayS = Math.max(0, (d.timeOffsetMs - currentMs) / 1000);

  const item: ActiveDanmaku = {
    trackKey: `${d.id}-${d.timeOffsetMs}-${Date.now()}`,
    raw: d,
    createdAt: Date.now(),
    lifetimeMs: (ANIMATION_DURATION_S + delayS) * 1000 + 500,
    style: {
      top: `${(trackIndex / trackCount) * 60}%`,
      color: d.color || '#FFFFFF',
      animationDuration: `${ANIMATION_DURATION_S}s`,
      animationDelay: `${delayS}s`,
    },
  };

  activeDanmakus.value = [...activeDanmakus.value, item];

  trackLastEnd.value[trackIndex] =
    d.timeOffsetMs + ANIMATION_DURATION_S * 1000 * 0.3;

  scheduleCleanup(item);
}

function processCurrentTime(currentMs: number) {
  if (Math.abs(currentMs - lastTimeMs) > 2000) {
    resetState();
  }
  lastTimeMs = currentMs;

  const danmakus = sortedDanmakus.value;

  while (
    lastProcessedIndex < danmakus.length &&
    danmakus[lastProcessedIndex].timeOffsetMs <= currentMs + WINDOW_MS
  ) {
    const d = danmakus[lastProcessedIndex];
    lastProcessedIndex++;

    if (d.timeOffsetMs < currentMs - 100) continue;
    if (activeDanmakus.value.some((a) => a.raw.id === d.id)) continue;

    const trackIndex = findAvailableTrack(d.timeOffsetMs);
    if (trackIndex === -1) continue;

    const delayS = Math.max(0, (d.timeOffsetMs - currentMs) / 1000);

    const item: ActiveDanmaku = {
      trackKey: `${d.id}-${d.timeOffsetMs}-${Date.now()}`,
      raw: d,
      createdAt: Date.now(),
      lifetimeMs: (ANIMATION_DURATION_S + delayS) * 1000 + 500,
      style: {
        top: `${(trackIndex / trackCount) * 60}%`,
        color: d.color || '#FFFFFF',
        animationDuration: `${ANIMATION_DURATION_S}s`,
        animationDelay: `${delayS}s`,
      },
    };

    activeDanmakus.value.push(item);

    trackLastEnd.value[trackIndex] =
      d.timeOffsetMs + ANIMATION_DURATION_S * 1000 * 0.3;

    scheduleCleanup(item);
  }
}

watch(
  () => props.currentTimeMs,
  (currentMs) => {
    if (props.paused) return;
    processCurrentTime(currentMs);
  },
);

function clearAllTimers() {
  for (const t of pendingTimers) {
    clearTimeout(t);
  }
  pendingTimers.length = 0;
}

watch(
  () => props.paused,
  (paused) => {
    if (paused) {
      clearAllTimers();
    } else {
      for (const item of activeDanmakus.value) {
        scheduleCleanup(item);
      }
    }
  },
);

function findAvailableTrack(timeMs: number): number {
  for (let i = 0; i < trackCount; i++) {
    if (trackLastEnd.value[i] <= timeMs) {
      return i;
    }
  }
  return Math.floor(Math.random() * trackCount);
}

function handleDanmakuHover(event: MouseEvent, item: ActiveDanmaku) {
  if (leaveTimer) {
    clearTimeout(leaveTimer);
    leaveTimer = null;
  }
  hoveredTrackKey.value = item.trackKey;
  contextMenuHovered.value = false;

  const overlayRect = overlayRef.value?.getBoundingClientRect();
  if (!overlayRect) return;
  const itemEl = event.currentTarget as HTMLElement;
  const itemRect = itemEl.getBoundingClientRect();

  contextMenu.x = Math.max(0, itemRect.left - overlayRect.left);
  contextMenu.y = Math.min(
    itemRect.bottom - overlayRect.top + 4,
    overlayRect.height - 48,
  );
  contextMenu.danmaku = item.raw;
  contextMenu.liked = props.likedIds?.has(item.raw.id) ?? false;
  contextMenu.visible = true;
}

function handleDanmakuLeave() {
  if (contextMenuHovered.value) return;
  if (leaveTimer) clearTimeout(leaveTimer);
  leaveTimer = setTimeout(() => {
    leaveTimer = null;
    if (contextMenuHovered.value) return;
    hoveredTrackKey.value = null;
    contextMenu.visible = false;
  }, 200);
}

function handleContextMenuEnter() {
  if (leaveTimer) {
    clearTimeout(leaveTimer);
    leaveTimer = null;
  }
  contextMenuHovered.value = true;
}

function handleContextMenuLeave() {
  if (leaveTimer) {
    clearTimeout(leaveTimer);
    leaveTimer = null;
  }
  contextMenuHovered.value = false;
  hoveredTrackKey.value = null;
  contextMenu.visible = false;
}

function handleDanmakuClick(event: MouseEvent, danmaku: DanmakuItem) {
  const rect = overlayRef.value?.getBoundingClientRect();
  if (!rect) return;
  contextMenu.x = event.clientX - rect.left;
  contextMenu.y = event.clientY - rect.top;
  contextMenu.danmaku = danmaku;
  contextMenu.liked = props.likedIds?.has(danmaku.id) ?? false;
  if (hoveredTrackKey.value) {
    contextMenu.visible = true;
  } else {
    contextMenu.visible = !contextMenu.visible;
  }
}

function handleLike() {
  if (contextMenu.danmaku) {
    emit('like', contextMenu.danmaku);
    contextMenu.liked = !contextMenu.liked;
  }
}

function handleReport() {
  if (contextMenu.danmaku) {
    emit('report', contextMenu.danmaku);
  }
}

function handleCopy() {
  if (!contextMenu.danmaku) return;
  const textarea = document.createElement('textarea');
  textarea.value = contextMenu.danmaku.content;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  textarea.style.pointerEvents = 'none';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand('copy');
  } catch {
    // 静默失败
  }
  document.body.removeChild(textarea);
}

function handleDelete() {
  if (contextMenu.danmaku) {
    const id = contextMenu.danmaku.id;
    activeDanmakus.value = activeDanmakus.value.filter((a) => a.raw.id !== id);
    emit('delete', contextMenu.danmaku);
  }
  contextMenu.visible = false;
  hoveredTrackKey.value = null;
}

function closeContextMenu() {
  if (contextMenuHovered.value) return;
  if (leaveTimer) {
    clearTimeout(leaveTimer);
    leaveTimer = null;
  }
  contextMenu.visible = false;
  hoveredTrackKey.value = null;
}

onMounted(() => {
  document.addEventListener('click', closeContextMenu);
});

onUnmounted(() => {
  document.removeEventListener('click', closeContextMenu);
});

watch(
  () => props.danmakus,
  (newList, oldList) => {
    if (!oldList || oldList.length === 0) {
      resetState();
      processCurrentTime(props.currentTimeMs);
      return;
    }
    const oldIds = new Set(oldList.map((d) => d.id));
    const newIds = new Set(newList.map((d) => d.id));
    const commonCount = [...oldIds].filter((id) => newIds.has(id)).length;
    if (commonCount < oldList.length * 0.5) {
      resetState();
      processCurrentTime(props.currentTimeMs);
      return;
    }
    for (const d of newList) {
      if (!oldIds.has(d.id)) {
        addSingleDanmaku(d);
      }
    }
    for (const oldId of oldIds) {
      if (!newIds.has(oldId)) {
        activeDanmakus.value = activeDanmakus.value.filter((a) => a.raw.id !== oldId);
      }
    }
  },
);

watch(
  () => props.visible,
  (newVal) => {
    if (newVal) {
      resetState();
      processCurrentTime(props.currentTimeMs);
    }
  },
);
</script>

<style scoped>
.danmaku-overlay {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 10;
}

.danmaku-item {
  position: absolute;
  left: 100%;
  white-space: nowrap;
  font-size: 18px;
  font-weight: 600;
  text-shadow:
    1px 1px 2px rgba(0, 0, 0, 0.8),
    -1px -1px 2px rgba(0, 0, 0, 0.8),
    1px -1px 2px rgba(0, 0, 0, 0.8),
    -1px 1px 2px rgba(0, 0, 0, 0.8);
  pointer-events: auto;
  cursor: pointer;
  animation: danmaku-scroll linear forwards;
  line-height: 1.4;
  padding: 2px 4px;
}

.danmaku-paused {
  animation-play-state: paused !important;
}

.danmaku-self {
  border: 2px solid #ffd700;
  border-radius: 6px;
  background: rgba(255, 215, 0, 0.08);
}

.danmaku-item:hover {
  background: rgba(0, 0, 0, 0.5);
  border-radius: 4px;
}

.danmaku-context-menu {
  position: absolute;
  z-index: 30;
  display: flex;
  gap: 2px;
  padding: 4px;
  border-radius: 8px;
  background: rgba(30, 41, 59, 0.92);
  backdrop-filter: blur(8px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  pointer-events: auto;
}

.ctx-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #e2e8f0;
  cursor: pointer;
  transition: all 0.12s ease;
}

.ctx-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.ctx-btn.liked {
  color: #60a5fa;
}

.ctx-btn.report:hover {
  color: #f87171;
}

.ctx-btn.delete:hover {
  color: #f87171;
}

.ctx-icon {
  width: 18px;
  height: 18px;
}

@keyframes danmaku-scroll {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(calc(-100% - 100vw));
  }
}
</style>
