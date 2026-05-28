<template>
  <section class="intro-card">
    <div class="intro-head">
      <h2>视频简介</h2>
      <button class="expand-btn" type="button" @click="expanded = !expanded">
        {{ expanded ? '收起' : '展开' }}
        <el-icon :size="14" class="expand-icon" :class="{ expanded }"><ArrowDown /></el-icon>
      </button>
    </div>

    <p class="intro-text" :class="{ collapsed: !expanded }">
      {{ video.description || '这个创作者还没有填写简介。' }}
    </p>

    <div class="tag-row">
      <RouterLink v-for="item in categoryItems" :key="item.code" class="intro-tag" :to="`/${item.code}`">
        #{{ item.label }}
      </RouterLink>
      <RouterLink class="intro-tag" :to="`/users/${video.creator.id}`">#{{ video.creator.nickname }}</RouterLink>
      <span v-if="publishText" class="intro-tag muted">{{ publishText }}</span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { ArrowDown } from '@element-plus/icons-vue';
import { videoCategoryOptions } from '@/constants/categories';
import type { VideoDetail } from '@/types/api';

const props = defineProps<{
  video: VideoDetail;
}>();

const expanded = ref(false);

const categoryItems = computed(() => {
  const codes = props.video.categories?.length ? props.video.categories : props.video.category ? [props.video.category] : [];
  return codes.map((code) => ({
    code,
    label: videoCategoryOptions.find((item) => item.code === code)?.label ?? code,
  }));
});

const publishText = computed(() => {
  const value = props.video.publishedAt ?? props.video.createdAt;
  if (!value) {
    return '';
  }
  return new Date(value).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
});
</script>

<style scoped>
.intro-card {
  display: grid;
  gap: 7px;
  padding: 10px 0 12px;
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
}

.intro-head h2 {
  margin: 0;
  color: var(--color-text-main);
  font-size: 15px;
  line-height: 1.35;
  font-weight: 800;
}

.expand-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: 0;
  background: transparent;
  color: var(--color-primary);
  font-size: 13px;
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
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
}

.intro-text.collapsed {
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.tag-row {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
}

.intro-tag {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 0 8px;
  border-radius: 6px;
  background: var(--color-primary-light);
  color: var(--color-primary);
  font-size: 12px;
  font-weight: 700;
}

.intro-tag.muted {
  background: var(--color-bg-muted);
  color: var(--color-text-secondary);
}
</style>
