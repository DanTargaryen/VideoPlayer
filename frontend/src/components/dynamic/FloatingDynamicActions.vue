<template>
  <nav class="floating-actions" aria-label="动态页快捷操作">
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
import { ChatDotRound, EditPen, Top } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';

defineEmits<{
  compose: [];
}>();

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openFeedback() {
  ElMessage.info('反馈入口正在建设中');
}
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
  padding: 6px;
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
