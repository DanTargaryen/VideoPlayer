<template>
  <div class="danmaku-overlay" ref="overlayRef" @click.self="$emit('overlay-click')" v-show="props.visible !== false">
    <div
      v-for="item in activeDanmakus"
      :key="item.trackKey"
      class="danmaku-item"
      :class="{ 'danmaku-paused': props.paused }"
      :style="item.style"
      @click.stop="handleDanmakuClick(item.raw)"
    >
      {{ item.raw.content }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { DanmakuItem } from '@/types/api';

const props = defineProps<{
  danmakus: DanmakuItem[];
  currentTimeMs: number;
  durationMs: number;
  visible?: boolean;
  paused?: boolean;
}>();

const emit = defineEmits<{
  (e: 'report', danmaku: DanmakuItem): void;
  (e: 'overlay-click'): void;
}>();

const overlayRef = ref<HTMLElement | null>(null);

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

const ANIMATION_DURATION_S = 8;

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

function handleDanmakuClick(danmaku: DanmakuItem) {
  emit('report', danmaku);
}

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

@keyframes danmaku-scroll {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(calc(-100% - 100vw));
  }
}
</style>
