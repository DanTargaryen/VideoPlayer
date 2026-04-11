<template>
  <article class="card">
    <img :src="item.coverUrl" :alt="item.title" class="cover" />
    <div class="card-body">
      <div class="title-block">
        <h3>{{ item.title }}</h3>
        <p>{{ item.description }}</p>
      </div>
      <div class="meta-row">
        <span class="meta-chip">{{ creatorLabel }}</span>
        <span class="meta-chip">点赞 {{ item.likeCount }}</span>
        <span class="meta-chip">收藏 {{ item.favoriteCount }}</span>
        <span class="meta-chip">评论 {{ item.commentCount }}</span>
      </div>
      <div class="actions">
        <RouterLink :to="`/video/${item.id}`" class="primary-link">查看详情</RouterLink>
        <RouterLink v-if="creatorId" :to="`/users/${creatorId}`" class="secondary-link">访问主页</RouterLink>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import type { VideoCard } from '@/types/api';

const props = defineProps<{
  item: VideoCard;
}>();

const creatorId = computed(() => props.item.creator?.id ?? props.item.creatorId ?? null);
const creatorLabel = computed(() => props.item.creator?.nickname ?? `用户 #${creatorId.value ?? '-'}`);
</script>

<style scoped>
.card {
  overflow: hidden;
  border-radius: 20px;
  background: linear-gradient(180deg, rgba(30, 41, 59, 0.96), rgba(15, 23, 42, 0.98));
  border: 1px solid rgba(148, 163, 184, 0.18);
  box-shadow: 0 12px 32px rgba(2, 6, 23, 0.25);
}

.cover {
  width: 100%;
  height: 200px;
  object-fit: cover;
}

.card-body {
  display: grid;
  gap: 14px;
  padding: 18px;
}

.title-block {
  display: grid;
  gap: 8px;
}

.title-block h3 {
  margin: 0;
  font-size: 18px;
}

.title-block p {
  margin: 0;
  color: #cbd5e1;
  line-height: 1.5;
}

.meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.meta-chip {
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(59, 130, 246, 0.12);
  color: #bfdbfe;
  font-size: 12px;
}

.actions {
  display: flex;
  gap: 12px;
}

.primary-link,
.secondary-link {
  font-size: 14px;
}

.primary-link {
  color: #60a5fa;
}

.secondary-link {
  color: #cbd5e1;
}
</style>
