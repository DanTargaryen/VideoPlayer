<template>
  <div class="danmaku-overlay" ref="overlayRef" @click.self="$emit('overlay-click')" v-show="props.visible !== false">
    <div
      v-for="item in activeDanmakus"
      :key="item.trackKey"
      class="danmaku-item"
      :class="{ 'danmaku-paused': props.paused }"
      :style="item.style"
      @click.stop="handleDanmakuClick($event, item.raw)"
    >
      {{ item.raw.content }}
    </div>

    <div
      v-if="contextMenu.visible"
      class="danmaku-context-menu"
      :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }"
    >
      <button class="ctx-btn like" :class="{ active: contextMenu.liked }" @click.stop="handleLike">
        <svg class="ctx-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M7 22V11L10.5 3.5C10.78 2.87 11.41 2.5 12.1 2.5C13.1 2.5 13.85 3.42 13.65 4.4L12.8 9H20c1.1 0 2 0.9 2 2v1c0 .15-.02.3-.05.44l-2.19 8C19.5 21.35 18.68 22 17.73 22H7ZM7 13v8M3 22h2V11H3v11Z" fill="currentColor"/>
        </svg>
        {{ contextMenu.liked ? '已赞' : '点赞' }}
      </button>
      <button class="ctx-btn report" @click.stop="handleReport">
        <svg class="ctx-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Zm1 15h-2v-2h2v2Zm0-4h-2V7h2v6Z" fill="currentColor"/>
        </svg>
        举报
      </button>
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
}>();

const emit = defineEmits<{
  (e: 'report', danmaku: DanmakuItem): void;
  (e: 'like', danmaku: DanmakuItem): void;
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

const WINDOW_MS = 500;

const trackCount = 12;

const trackLastEnd = ref<number[]>(new Array(trackCount).fill(-Infinity));

interface ActiveDanmaku {
  trackKey: string;
  raw: DanmakuItem;
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
  lastProcessedIndex = 0;
  lastTimeMs = 0;
  activeDanmakus.value = [];
  trackLastEnd.value = new Array(trackCount).fill(-Infinity);
  for (const t of pendingTimers) {
    clearTimeout(t);
  }
  pendingTimers.length = 0;
}

watch(
  () => props.currentTimeMs,
  (currentMs) => {
    if (props.paused) return;

    if (currentMs < lastTimeMs - 2000) {
      resetState();
    }
    lastTimeMs = currentMs;

    const danmakus = sortedDanmakus.value;

    while (
      lastProcessedIndex < danmakus.length &&
      danmakus[lastProcessedIndex].timeOffsetMs <= currentMs + WINDOW_MS
    ) {
      const d = danmakus[lastProcessedIndex];

      if (d.timeOffsetMs >= currentMs - 100) {
        const trackIndex = findAvailableTrack(d.timeOffsetMs);
        if (trackIndex !== -1) {
          const delayS = Math.max(0, (d.timeOffsetMs - currentMs) / 1000);

          const item: ActiveDanmaku = {
            trackKey: `${d.id}-${d.timeOffsetMs}-${Date.now()}`,
            raw: d,
            style: {
              top: `${(trackIndex / trackCount) * 100}%`,
              color: d.color || '#FFFFFF',
              animationDuration: `${ANIMATION_DURATION_S}s`,
              animationDelay: `${delayS}s`,
            },
          };

          activeDanmakus.value.push(item);

          trackLastEnd.value[trackIndex] =
            d.timeOffsetMs + ANIMATION_DURATION_S * 1000 * 0.3;

          const itemId = item.trackKey;
          const timer = setTimeout(() => {
            activeDanmakus.value = activeDanmakus.value.filter(
              (a) => a.trackKey !== itemId,
            );
            const idx = pendingTimers.indexOf(timer);
            if (idx !== -1) pendingTimers.splice(idx, 1);
          }, (ANIMATION_DURATION_S + delayS) * 1000 + 500);
          pendingTimers.push(timer);
        }
      }

      lastProcessedIndex++;
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

function handleDanmakuClick(event: MouseEvent, danmaku: DanmakuItem) {
  const rect = overlayRef.value?.getBoundingClientRect();
  if (!rect) return;
  contextMenu.x = event.clientX - rect.left;
  contextMenu.y = event.clientY - rect.top;
  contextMenu.danmaku = danmaku;
  contextMenu.liked = props.likedIds?.has(danmaku.id) ?? false;
  contextMenu.visible = true;
}

function handleLike() {
  if (contextMenu.danmaku) {
    emit('like', contextMenu.danmaku);
    contextMenu.liked = !contextMenu.liked;
  }
  contextMenu.visible = false;
}

function handleReport() {
  if (contextMenu.danmaku) {
    emit('report', contextMenu.danmaku);
  }
  contextMenu.visible = false;
}

function closeContextMenu() {
  contextMenu.visible = false;
}

onMounted(() => {
  document.addEventListener('click', closeContextMenu);
});

onUnmounted(() => {
  document.removeEventListener('click', closeContextMenu);
});

watch(
  () => props.danmakus,
  () => {
    resetState();
  },
);

watch(
  () => props.visible,
  (newVal) => {
    if (newVal) {
      resetState();
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
  gap: 4px;
  padding: 6px 12px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #e2e8f0;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.12s ease;
  white-space: nowrap;
}

.ctx-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.ctx-btn.like.active {
  color: #60a5fa;
}

.ctx-btn.report:hover {
  color: #f87171;
}

.ctx-icon {
  width: 14px;
  height: 14px;
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
