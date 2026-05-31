<template>
  <nav class="floating-actions" aria-label="动态页快捷操作">
    <button type="button" @click="scrollToTop">
      <el-icon><Top /></el-icon>
      <span>回到顶部</span>
    </button>
    <button type="button" @click="openFeedback">
      <el-icon><ChatDotRound /></el-icon>
      <span>反馈建议</span>
    </button>
    <button type="button" @click="$emit('compose')">
      <el-icon><EditPen /></el-icon>
      <span>发布动态</span>
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
  display: grid;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 16px 34px rgba(15, 23, 42, 0.12);
  backdrop-filter: blur(12px);
}

.floating-actions button {
  display: grid;
  justify-items: center;
  gap: 4px;
  width: 62px;
  min-height: 64px;
  border: 0;
  border-bottom: 1px solid var(--color-border-soft);
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  font-size: 11px;
  font-weight: 800;
  transition: background var(--gl-transition), color var(--gl-transition), transform var(--gl-transition);
}

.floating-actions button:last-child {
  border-bottom: 0;
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
