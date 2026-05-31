<template>
  <Teleport to="body">
    <div v-if="assistantStore.tourActive" class="assistant-tour" aria-live="polite">
      <div v-if="assistantStore.tourLoading" class="assistant-tour__loading-card">
        <span class="assistant-tour__eyebrow">网站教程</span>
        <strong>正在准备教程...</strong>
        <p>澜澜正在定位推荐视频和页面入口。</p>
        <button type="button" @click="assistantStore.stopTour">取消</button>
      </div>

      <template v-else-if="currentStep">
        <div v-if="targetRect" class="assistant-tour__spotlight" :style="spotlightStyle"></div>

        <article
          class="assistant-tour__card"
          :class="`assistant-tour__card--${cardPlacement}`"
          :style="cardStyle"
        >
          <span class="assistant-tour__eyebrow">网站教程 · {{ progressText }}</span>
          <h3>{{ currentStep.title }}</h3>
          <p>{{ currentStep.description }}</p>
          <p v-if="currentStep.transition" class="assistant-tour__transition">
            <strong>怎么到下一步？</strong>
            {{ currentStep.transition }}
          </p>
          <p v-if="isAuthRedirect" class="assistant-tour__note">
            这个环节需要登录。完成登录后，页面会自动回到目标功能，教程也会继续定位对应区域。
          </p>
          <p v-else-if="targetMissing" class="assistant-tour__note">
            暂时没有定位到目标区域，可能是页面数据还在加载；你仍然可以继续下一步。
          </p>

          <div class="assistant-tour__progress" aria-hidden="true">
            <span :style="progressBarStyle"></span>
          </div>

          <footer class="assistant-tour__actions">
            <button type="button" :disabled="assistantStore.tourStepIndex === 0" @click="assistantStore.previousTourStep">
              上一步
            </button>
            <button type="button" class="assistant-tour__ghost" @click="assistantStore.stopTour">结束教程</button>
            <button type="button" class="assistant-tour__primary" @click="assistantStore.nextTourStep">
              {{ nextButtonLabel }}
            </button>
          </footer>
        </article>
      </template>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useAssistantStore } from '@/stores/assistant';
import type { AssistantTourPlacement } from '@/constants/assistant-tour';

interface TargetRect {
  left: number;
  top: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
}

interface MeasuredRect {
  left: number;
  top: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
}

const CARD_WIDTH = 340;
const CARD_HEIGHT = 310;
const VIEWPORT_GAP = 16;
const CARD_GAP = 14;
const DEFAULT_HIGHLIGHT_PADDING = 10;
const INITIAL_RECT_SYNC_DURATION_MS = 900;
const INITIAL_RECT_SYNC_INTERVAL_MS = 80;
const RECT_STABLE_THRESHOLD = 1;
const RECT_STABLE_SAMPLE_COUNT = 2;
const TARGET_RECT_TRACK_INTERVAL_MS = 120;

const assistantStore = useAssistantStore();
const router = useRouter();
const route = useRoute();
const targetRect = ref<TargetRect | null>(null);
const targetMissing = ref(false);
const targetElement = ref<Element | null>(null);
const targetSettling = ref(false);
const attemptedNavigationKey = ref('');
let syncVersion = 0;
let viewportFrame = 0;
let lastStepId = '';
let targetRectTrackTimer: number | null = null;

const currentStep = computed(() => assistantStore.currentTourStep);
const isLastStep = computed(() => assistantStore.tourStepIndex >= assistantStore.tourSteps.length - 1);
const nextButtonLabel = computed(() => (isLastStep.value ? '完成' : currentStep.value?.nextLabel ?? '下一步'));
const progressText = computed(() => `${assistantStore.tourStepIndex + 1}/${assistantStore.tourSteps.length}`);
const progressBarStyle = computed(() => ({
  width: `${Math.max(0, ((assistantStore.tourStepIndex + 1) / Math.max(assistantStore.tourSteps.length, 1)) * 100)}%`,
}));

const expectedFullPath = computed(() => {
  const step = currentStep.value;
  return step ? router.resolve(step.route).fullPath : '';
});

const isAuthRedirect = computed(() => {
  const step = currentStep.value;
  return Boolean(step?.requiresAuth && route.name === 'login' && expectedFullPath.value && route.fullPath !== expectedFullPath.value);
});

const spotlightStyle = computed(() => {
  const rect = targetRect.value;
  if (!rect) return {};

  return {
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
  };
});

const cardPlacement = computed<Exclude<AssistantTourPlacement, 'auto'>>(() => {
  const rect = targetRect.value;
  const preferred = currentStep.value?.placement ?? 'auto';
  if (!rect) return 'bottom';

  return resolvePlacement(rect, preferred);
});

const cardStyle = computed(() => {
  const rect = targetRect.value;
  const viewportWidth = window.innerWidth || 1200;
  const viewportHeight = window.innerHeight || 800;

  if (!rect) {
    return {
      left: `${Math.max(VIEWPORT_GAP, viewportWidth / 2 - CARD_WIDTH / 2)}px`,
      top: `${Math.max(VIEWPORT_GAP, viewportHeight / 2 - CARD_HEIGHT / 2)}px`,
    };
  }

  const placement = cardPlacement.value;
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  let left = centerX - CARD_WIDTH / 2;
  let top = rect.bottom + CARD_GAP;

  if (placement === 'right') {
    left = rect.right + CARD_GAP;
    top = centerY - CARD_HEIGHT / 2;
  } else if (placement === 'left') {
    left = rect.left - CARD_WIDTH - CARD_GAP;
    top = centerY - CARD_HEIGHT / 2;
  } else if (placement === 'top') {
    left = centerX - CARD_WIDTH / 2;
    top = rect.top - CARD_HEIGHT - CARD_GAP;
  }

  return {
    left: `${clamp(left, VIEWPORT_GAP, viewportWidth - CARD_WIDTH - VIEWPORT_GAP)}px`,
    top: `${clamp(top, VIEWPORT_GAP, viewportHeight - CARD_HEIGHT - VIEWPORT_GAP)}px`,
  };
});

watch(
  () => [assistantStore.tourActive, assistantStore.tourLoading, assistantStore.tourStepIndex, route.fullPath],
  () => {
    const stepId = currentStep.value?.id ?? '';
    if (stepId !== lastStepId) {
      lastStepId = stepId;
      attemptedNavigationKey.value = '';
    }

    void syncCurrentStep();
  },
  { immediate: true },
);

window.addEventListener('resize', scheduleViewportUpdate);
window.addEventListener('scroll', scheduleViewportUpdate, true);

onBeforeUnmount(() => {
  stopTargetRectTracking();
  window.removeEventListener('resize', scheduleViewportUpdate);
  window.removeEventListener('scroll', scheduleViewportUpdate, true);
  if (viewportFrame) {
    window.cancelAnimationFrame(viewportFrame);
  }
});

async function syncCurrentStep() {
  const step = currentStep.value;
  if (!assistantStore.tourActive || assistantStore.tourLoading || !step) {
    targetRect.value = null;
    targetMissing.value = false;
    targetElement.value = null;
    stopTargetRectTracking();
    return;
  }

  const version = ++syncVersion;
  await ensureRoute(step);
  if (version !== syncVersion) return;
  await locateTarget(step, version);
}

async function ensureRoute(step: NonNullable<typeof currentStep.value>) {
  const targetRoute = router.resolve(step.route);
  if (route.fullPath === targetRoute.fullPath) {
    return;
  }

  const navigationKey = `${step.id}:${targetRoute.fullPath}`;
  if (attemptedNavigationKey.value === navigationKey) {
    return;
  }

  attemptedNavigationKey.value = navigationKey;
  try {
    await router.push(step.route);
  } catch {
    // Keep the tour visible even if navigation is interrupted by the user or route guard.
  }
}

async function locateTarget(step: NonNullable<typeof currentStep.value>, version: number) {
  targetMissing.value = false;
  targetElement.value = null;
  targetRect.value = null;
  targetSettling.value = true;
  stopTargetRectTracking();

  try {
    for (let attempt = 0; attempt < 28; attempt += 1) {
      if (version !== syncVersion || !assistantStore.tourActive) return;
      await nextTick();
      if (attempt > 0) {
        await wait(80);
      }

      const element = findTargetElement(step.selectors);
      if (!element) {
        continue;
      }

      targetElement.value = element;
      const elementRect = element.getBoundingClientRect();
      const shouldScroll = !isRectVisibleEnough(elementRect, step);

      if (shouldScroll) {
        element.scrollIntoView({ block: attempt === 0 ? 'center' : 'nearest', inline: 'nearest', behavior: attempt === 0 ? 'smooth' : 'auto' });
      }

      const settledRect = await waitForVisibleRect(element, version, step);
      if (!settledRect) {
        continue;
      }

      updateTargetRect(settledRect);
      await syncInitialTargetRect(element, version);
      startTargetRectTracking(version);
      targetMissing.value = false;
      return;
    }

    targetMissing.value = true;
  } finally {
    targetSettling.value = false;
  }
}

function startTargetRectTracking(version: number) {
  stopTargetRectTracking();

  targetRectTrackTimer = window.setInterval(() => {
    if (version !== syncVersion || !assistantStore.tourActive || !targetElement.value) {
      stopTargetRectTracking();
      return;
    }

    updateTargetRect();
  }, TARGET_RECT_TRACK_INTERVAL_MS);
}

function stopTargetRectTracking() {
  if (!targetRectTrackTimer) return;
  window.clearInterval(targetRectTrackTimer);
  targetRectTrackTimer = null;
}

function findTargetElement(selectors: string[]) {
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (!element) continue;

    const rect = element.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      return element;
    }
  }

  return null;
}

function updateTargetRect(rectInput?: DOMRect) {
  const element = targetElement.value;
  const step = currentStep.value;
  if (!element || !step) return;

  const rect = rectInput ?? element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return;

  const padding = step.highlightPadding ?? DEFAULT_HIGHLIGHT_PADDING;
  const viewportWidth = window.innerWidth || 1200;
  const viewportHeight = window.innerHeight || 800;
  const left = clamp(rect.left - padding, VIEWPORT_GAP / 2, viewportWidth - VIEWPORT_GAP / 2);
  const top = clamp(rect.top - padding, VIEWPORT_GAP / 2, viewportHeight - VIEWPORT_GAP / 2);
  const right = clamp(rect.right + padding, VIEWPORT_GAP / 2, viewportWidth - VIEWPORT_GAP / 2);
  const bottom = clamp(rect.bottom + padding, VIEWPORT_GAP / 2, viewportHeight - VIEWPORT_GAP / 2);

  targetRect.value = {
    left,
    top,
    right,
    bottom,
    width: Math.max(24, right - left),
    height: Math.max(24, bottom - top),
  };
}

function scheduleViewportUpdate() {
  if (!assistantStore.tourActive || !targetElement.value || targetSettling.value) return;
  if (viewportFrame) return;

  viewportFrame = window.requestAnimationFrame(() => {
    viewportFrame = 0;
    updateTargetRect();
  });
}

function resolvePlacement(rect: TargetRect, preferred: AssistantTourPlacement) {
  const viewportWidth = window.innerWidth || 1200;
  const viewportHeight = window.innerHeight || 800;
  const spaces = {
    right: viewportWidth - rect.right,
    left: rect.left,
    bottom: viewportHeight - rect.bottom,
    top: rect.top,
  };

  const preferredPlacement = preferred !== 'auto' ? preferred : null;
  const candidates: Array<Exclude<AssistantTourPlacement, 'auto'>> = preferredPlacement
    ? [preferredPlacement, 'right', 'left', 'bottom', 'top']
    : ['right', 'left', 'bottom', 'top'];

  for (const candidate of candidates) {
    if ((candidate === 'right' || candidate === 'left') && spaces[candidate] >= CARD_WIDTH + CARD_GAP + VIEWPORT_GAP) {
      return candidate;
    }

    if ((candidate === 'top' || candidate === 'bottom') && spaces[candidate] >= CARD_HEIGHT + CARD_GAP + VIEWPORT_GAP) {
      return candidate;
    }
  }

  return Object.entries(spaces).sort((left, right) => right[1] - left[1])[0][0] as Exclude<AssistantTourPlacement, 'auto'>;
}

async function waitForVisibleRect(element: Element, version: number, step: NonNullable<typeof currentStep.value>) {
  for (let attempt = 0; attempt < 18; attempt += 1) {
    if (version !== syncVersion || !assistantStore.tourActive) return null;

    if (attempt > 0) {
      await wait(90);
    } else {
      await wait(30);
    }

    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      continue;
    }

    if (isRectVisibleEnough(rect, step)) {
      return rect;
    }
  }

  return null;
}

async function syncInitialTargetRect(element: Element, version: number) {
  const startedAt = Date.now();
  let previousRect: MeasuredRect | null = null;
  let stableCount = 0;

  while (Date.now() - startedAt < INITIAL_RECT_SYNC_DURATION_MS) {
    if (version !== syncVersion || !assistantStore.tourActive || targetElement.value !== element) return;

    await wait(INITIAL_RECT_SYNC_INTERVAL_MS);
    if (version !== syncVersion || !assistantStore.tourActive || targetElement.value !== element) return;

    const rect = toMeasuredRect(element.getBoundingClientRect());
    if (rect.width <= 0 || rect.height <= 0) {
      continue;
    }

    updateTargetRect(element.getBoundingClientRect());

    if (previousRect && areRectsClose(previousRect, rect)) {
      stableCount += 1;
      if (stableCount >= RECT_STABLE_SAMPLE_COUNT) {
        return;
      }
    } else {
      stableCount = 0;
      previousRect = rect;
    }
  }
}

function toMeasuredRect(rect: DOMRect): MeasuredRect {
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
    right: rect.right,
    bottom: rect.bottom,
  };
}

function areRectsClose(left: MeasuredRect, right: MeasuredRect) {
  return (
    Math.abs(left.left - right.left) <= RECT_STABLE_THRESHOLD &&
    Math.abs(left.top - right.top) <= RECT_STABLE_THRESHOLD &&
    Math.abs(left.width - right.width) <= RECT_STABLE_THRESHOLD &&
    Math.abs(left.height - right.height) <= RECT_STABLE_THRESHOLD
  );
}

function isRectVisibleEnough(rect: DOMRect, step?: NonNullable<typeof currentStep.value>) {
  const viewportWidth = window.innerWidth || 1200;
  const viewportHeight = window.innerHeight || 800;
  const visibleWidth = Math.min(rect.right, viewportWidth) - Math.max(rect.left, 0);
  const visibleHeight = Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0);

  if (visibleWidth <= 0 || visibleHeight <= 0) {
    return false;
  }

  const isHeaderLikeTarget = step?.selectors.some((selector) => selector.includes('header-') || selector.includes('site-header')) ?? false;

  if (isHeaderLikeTarget) {
    const minVisibleWidth = Math.min(rect.width, Math.max(24, rect.width * 0.3));
    const minVisibleHeight = Math.min(rect.height, Math.max(18, rect.height * 0.3));
    return visibleWidth >= minVisibleWidth && visibleHeight >= minVisibleHeight;
  }

  const minVisibleWidth = Math.min(rect.width, Math.max(72, viewportWidth * 0.18));
  const minVisibleHeight = Math.min(rect.height, Math.max(72, viewportHeight * 0.18));

  return visibleWidth >= minVisibleWidth && visibleHeight >= minVisibleHeight;
}

function clamp(value: number, min: number, max: number) {
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
</script>

<style scoped>
.assistant-tour {
  position: fixed;
  inset: 0;
  z-index: 6100;
  pointer-events: none;
}

.assistant-tour__spotlight {
  position: fixed;
  z-index: 1;
  border: 2px solid rgba(96, 165, 250, 0.95);
  border-radius: 18px;
  box-shadow:
    0 0 0 9999px rgba(15, 23, 42, 0.62),
    0 0 28px rgba(59, 130, 246, 0.6);
  transition:
    left 180ms ease,
    top 180ms ease,
    width 180ms ease,
    height 180ms ease;
}

.assistant-tour__card,
.assistant-tour__loading-card {
  position: fixed;
  z-index: 2;
  width: min(340px, calc(100vw - 32px));
  min-height: 210px;
  padding: 18px;
  border: 1px solid rgba(147, 197, 253, 0.7);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 28px 80px rgba(15, 23, 42, 0.28);
  color: #0f172a;
  pointer-events: auto;
  transition:
    left 180ms ease,
    top 180ms ease;
}

.assistant-tour__loading-card {
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
}

.assistant-tour__card::after {
  position: absolute;
  width: 14px;
  height: 14px;
  content: '';
  border-left: 1px solid rgba(147, 197, 253, 0.7);
  border-top: 1px solid rgba(147, 197, 253, 0.7);
  background: rgba(255, 255, 255, 0.98);
}

.assistant-tour__card--right::after {
  left: -8px;
  top: 50%;
  transform: translateY(-50%) rotate(-45deg);
}

.assistant-tour__card--left::after {
  right: -8px;
  top: 50%;
  transform: translateY(-50%) rotate(135deg);
}

.assistant-tour__card--top::after {
  left: 50%;
  bottom: -8px;
  transform: translateX(-50%) rotate(-135deg);
}

.assistant-tour__card--bottom::after {
  left: 50%;
  top: -8px;
  transform: translateX(-50%) rotate(45deg);
}

.assistant-tour__eyebrow {
  display: block;
  margin-bottom: 8px;
  color: #2563eb;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.assistant-tour__card h3,
.assistant-tour__loading-card strong {
  display: block;
  margin: 0 0 8px;
  font-size: 18px;
  line-height: 1.35;
}

.assistant-tour__card p,
.assistant-tour__loading-card p {
  margin: 0;
  color: #475569;
  font-size: 14px;
  line-height: 1.65;
}

.assistant-tour__note {
  margin-top: 10px !important;
  padding: 9px 10px;
  border-radius: 12px;
  background: #eff6ff;
  color: #1d4ed8 !important;
  font-weight: 700;
}

.assistant-tour__transition {
  margin-top: 10px !important;
  padding: 10px 12px;
  border: 1px solid rgba(37, 99, 235, 0.16);
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(239, 246, 255, 0.95), rgba(248, 250, 252, 0.95));
  color: #334155 !important;
}

.assistant-tour__transition strong {
  display: block;
  margin-bottom: 4px;
  color: #1d4ed8;
  font-size: 13px;
}

.assistant-tour__progress {
  height: 6px;
  margin: 16px 0 14px;
  overflow: hidden;
  border-radius: 999px;
  background: #e2e8f0;
}

.assistant-tour__progress span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #2563eb, #60a5fa);
  transition: width 180ms ease;
}

.assistant-tour__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: nowrap;
}

.assistant-tour__actions button,
.assistant-tour__loading-card button {
  min-height: 34px;
  padding: 0 12px;
  border: 1px solid #dbeafe;
  border-radius: 12px;
  background: #fff;
  color: #2563eb;
  font-weight: 900;
  cursor: pointer;
  white-space: nowrap;
}

.assistant-tour__actions button {
  flex: 0 0 auto;
}

.assistant-tour__actions .assistant-tour__primary {
  min-width: 0;
  max-width: 136px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.assistant-tour__actions button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.assistant-tour__actions .assistant-tour__ghost {
  color: #64748b;
}

.assistant-tour__actions .assistant-tour__primary {
  border-color: #2563eb;
  background: #2563eb;
  color: #fff;
}

@media (max-width: 720px) {
  .assistant-tour__card,
  .assistant-tour__loading-card {
    left: 16px !important;
    right: 16px;
    top: auto !important;
    bottom: 16px;
    width: auto;
    min-height: 0;
  }

  .assistant-tour__card::after {
    display: none;
  }
}
</style>
