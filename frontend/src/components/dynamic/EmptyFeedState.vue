<template>
  <section class="empty-state">
    <div class="empty-mark">
      <el-icon :size="28"><Collection /></el-icon>
    </div>
    <h2>{{ title }}</h2>
    <p>{{ description }}</p>
    <RouterLink to="/search?tab=video" class="discover-link">去发现内容</RouterLink>
  </section>
</template>

<script setup lang="ts">
import { Collection } from '@element-plus/icons-vue';

withDefaults(
  defineProps<{
    title?: string;
    description?: string;
  }>(),
  {
    title: '还没有动态',
    description: '关注你喜欢的创作者，第一时间看到他们的新内容',
  },
);
</script>

<style scoped>
.empty-state {
  display: grid;
  justify-items: center;
  gap: 12px;
  padding: 64px 24px;
  border: 1px solid var(--color-border);
  border-radius: 18px;
  background: var(--color-bg-card);
  box-shadow: var(--gl-shadow-card);
  text-align: center;
}

.empty-mark {
  display: grid;
  place-items: center;
  width: 62px;
  height: 62px;
  border-radius: 20px;
  background: var(--color-primary-light);
  color: var(--color-primary);
}

.empty-state h2 {
  margin: 6px 0 0;
  color: var(--color-text-main);
  font-size: 22px;
}

.empty-state p {
  margin: 0;
  color: var(--color-text-secondary);
}

.discover-link {
  margin-top: 8px;
  padding: 10px 18px;
  border-radius: 12px;
  background: var(--color-primary);
  color: #ffffff;
  font-weight: 800;
  transition: background var(--gl-transition), transform var(--gl-transition);
}

.discover-link:hover {
  background: var(--color-primary-hover);
}

.discover-link:active {
  transform: translateY(1px) scale(0.98);
}
</style>
