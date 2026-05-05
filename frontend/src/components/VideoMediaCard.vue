<template>
  <article class="card">
    <RouterLink
      :to="`/video/${item.id}`"
      class="cover-wrap"
      :class="{ 'is-previewing': isPreviewing && previewReady }"
      @mouseenter="startPreview"
      @mouseleave="stopPreview"
    >
      <img :src="item.coverUrl" :alt="item.title" class="cover" />
      <video
        v-if="hasHoverPreview"
        ref="previewVideoRef"
        class="cover-preview"
        :src="item.playUrl"
        :poster="item.coverUrl"
        muted
        loop
        playsinline
        preload="none"
        @loadeddata="handlePreviewLoaded"
      ></video>
      <div class="cover-stats">
        <span v-if="showPlayCount" class="stat-item">
          <svg class="stat-icon" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 5C6.79 5 3.1 8.26 1.82 12c1.28 3.74 4.97 7 10.18 7s8.9-3.26 10.18-7C20.9 8.26 17.21 5 12 5Zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm0-2.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"/>
          </svg>
          {{ item.playCount ?? 0 }}
        </span>
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
        <RouterLink v-if="showAuthorLink" :to="`/users/${creatorId}`" class="author">{{ creatorLabel }}</RouterLink>
        <span v-else class="author static">{{ creatorLabel }}</span>
        <span class="time">{{ formattedTime }}</span>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { StarFilled, ChatDotRound } from '@element-plus/icons-vue';

import type { VideoCard } from '@/types/api';

const props = defineProps<{
  item: VideoCard;
  hoverPreview?: boolean;
  showPlayCount?: boolean;
  disableAuthorLink?: boolean;
}>();

const previewVideoRef = ref<HTMLVideoElement | null>(null);
const isPreviewing = ref(false);
const previewReady = ref(false);

const hasHoverPreview = computed(() => Boolean(props.hoverPreview && props.item.playUrl));
const creatorId = computed(() => props.item.creator?.id ?? props.item.creatorId ?? null);
const creatorLabel = computed(() => props.item.creator?.nickname ?? `用户 #${creatorId.value ?? '-'}`);
const showAuthorLink = computed(() => Boolean(creatorId.value) && !props.disableAuthorLink);

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

function handlePreviewLoaded() {
  previewReady.value = true;
}

async function startPreview() {
  if (!hasHoverPreview.value || !previewVideoRef.value) return;

  isPreviewing.value = true;

  try {
    previewVideoRef.value.currentTime = 0;
  } catch {
    // ignore seek errors before metadata is ready
  }

  try {
    await previewVideoRef.value.play();
  } catch {
    isPreviewing.value = false;
  }
}

function stopPreview() {
  if (!previewVideoRef.value) {
    isPreviewing.value = false;
    return;
  }

  isPreviewing.value = false;
  previewVideoRef.value.pause();

  try {
    previewVideoRef.value.currentTime = 0;
  } catch {
    // ignore seek errors before metadata is ready
  }
}
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
  background: #000;
}

.cover {
  width: 100%;
  height: 200px;
  object-fit: cover;
  display: block;
  transition: opacity 0.2s ease;
}

.cover-preview {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 200px;
  object-fit: cover;
  display: block;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
}

.cover-wrap.is-previewing .cover {
  opacity: 0;
}

.cover-wrap.is-previewing .cover-preview {
  opacity: 1;
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
