<template>
  <section class="intro-card">
    <div class="intro-head">
      <h2>视频简介</h2>
      <button v-if="canToggle" class="expand-btn" type="button" @click="expanded = !expanded">
        {{ expanded ? '收起' : '展开' }}
        <el-icon :size="14" class="expand-icon" :class="{ expanded }"><ArrowDown /></el-icon>
      </button>
    </div>

    <p ref="introTextRef" class="intro-text" :class="{ collapsed: canToggle && !expanded }">
      {{ descriptionText }}
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { ArrowDown } from '@element-plus/icons-vue';
import type { VideoDetail } from '@/types/api';

const props = defineProps<{
  video: VideoDetail;
}>();

const expanded = ref(false);
const canToggle = ref(false);
const introTextRef = ref<HTMLElement | null>(null);
let resizeObserver: ResizeObserver | null = null;

const descriptionText = computed(() => props.video.description?.trim() || '这个创作者还没有填写简介。');

function updateToggleState() {
  const element = introTextRef.value;
  if (!element) {
    canToggle.value = false;
    return;
  }

  const styles = window.getComputedStyle(element);
  const lineHeight = Number.parseFloat(styles.lineHeight);
  const maxCollapsedHeight = (Number.isFinite(lineHeight) ? lineHeight : 20) * 2;
  canToggle.value = element.scrollHeight > maxCollapsedHeight + 2;
}

async function refreshToggleState() {
  await nextTick();
  updateToggleState();
}

watch(descriptionText, () => {
  expanded.value = false;
  void refreshToggleState();
});

onMounted(() => {
  void refreshToggleState();

  if (typeof ResizeObserver !== 'undefined' && introTextRef.value) {
    resizeObserver = new ResizeObserver(() => {
      updateToggleState();
    });
    resizeObserver.observe(introTextRef.value);
  }
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
});
</script>

<style scoped>
.intro-card {
  display: grid;
  gap: 8px;
  padding: 10px 0 8px 28px;
  border: 0;
  border-radius: 0;
  background: var(--color-bg-card);
  box-shadow: none;
}

.intro-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 24px;
}

.intro-head h2 {
  margin: 0;
  color: var(--color-text-main);
  font-size: 15px;
  line-height: 24px;
  font-weight: 800;
}

.expand-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: 0;
  padding: 0;
  min-height: 24px;
  background: transparent;
  color: var(--color-primary);
  font-size: 13px;
  line-height: 24px;
  font-weight: 700;
  cursor: pointer;
}

.expand-icon {
  transition: transform 180ms cubic-bezier(0.16, 1, 0.3, 1);
}

.expand-icon.expanded {
  transform: rotate(180deg);
}

.intro-text {
  margin: 0;
  color: #475569;
  font-size: 13px;
  line-height: 20px;
  white-space: pre-wrap;
  word-break: break-word;
}

.intro-text.collapsed {
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

</style>
