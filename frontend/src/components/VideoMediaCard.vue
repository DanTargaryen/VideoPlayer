<template>
  <article class="card">
    <RouterLink :to="`/video/${item.id}`" class="cover-wrap">
      <img :src="item.coverUrl" :alt="item.title" class="cover" />
      <div class="cover-stats">
        <span class="stat-item">
          <svg class="stat-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M7 22V11L10.5 3.5C10.78 2.87 11.41 2.5 12.1 2.5C13.1 2.5 13.85 3.42 13.65 4.4L12.8 9H20c1.1 0 2 0.9 2 2v1c0 .15-.02.3-.05.44l-2.19 8C19.5 21.35 18.68 22 17.73 22H7ZM7 13v8M3 22h2V11H3v11Z" fill="currentColor"/>
          </svg>
          {{ item.likeCount }}
        </span>
        <span class="stat-item">
          <el-icon :size="14"><StarFilled /></el-icon>
          {{ item.favoriteCount }}
        </span>
        <span class="stat-item">
          <el-icon :size="14"><ChatDotRound /></el-icon>
          {{ item.commentCount }}
        </span>
      </div>
    </RouterLink>
    <div class="card-info">
      <h3 class="title">{{ item.title }}</h3>
      <div class="meta">
        <RouterLink v-if="creatorId" :to="`/users/${creatorId}`" class="author">{{ creatorLabel }}</RouterLink>
        <span v-else class="author static">{{ creatorLabel }}</span>
        <span class="time">{{ formattedTime }}</span>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { StarFilled, ChatDotRound } from '@element-plus/icons-vue';

import type { VideoCard } from '@/types/api';

const props = defineProps<{
  item: VideoCard;
}>();

const creatorId = computed(() => props.item.creator?.id ?? props.item.creatorId ?? null);
const creatorLabel = computed(() => props.item.creator?.nickname ?? `用户 #${creatorId.value ?? '-'}`);

const formattedTime = computed(() => {
  const raw = props.item.publishedAt ?? props.item.createdAt;
  if (!raw) return '';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return '刚刚';
  if (diffMin < 60) return `${diffMin}分钟前`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}小时前`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}天前`;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
});
</script>

<style scoped>
.card {
  display: flex;
  flex-direction: column;
}

.cover-wrap {
  position: relative;
  display: block;
  text-decoration: none;
  border-radius: 6px;
  overflow: hidden;
}

.cover {
  width: 100%;
  height: 200px;
  object-fit: cover;
  display: block;
}

.cover-stats {
  position: absolute;
  right: 10px;
  bottom: 10px;
  display: flex;
  gap: 10px;
  padding: 6px 14px;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(6px);
}

.stat-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: rgba(255, 255, 255, 0.92);
  font-size: 13px;
  line-height: 1;
}

.stat-icon {
  width: 14px;
  height: 14px;
}

.card-info {
  padding: 12px 4px 0;
}

.title {
  margin: 0 0 6px;
  font-size: 15px;
  font-weight: 600;
  color: #111827;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: #9ca3af;
}

.author {
  color: #2563eb;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.15s;
}

.author:hover {
  color: #1d4ed8;
}

.author.static {
  color: #6b7280;
}

.time {
  color: #9ca3af;
  margin-left: auto;
}
</style>
