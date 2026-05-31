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
      <span v-if="durationLabel" class="duration-badge">{{ durationLabel }}</span>
    </RouterLink>
    <div class="card-info">
      <RouterLink :to="`/video/${item.id}`" class="title-link">
        <h3 class="title">{{ item.title }}</h3>
      </RouterLink>
      <div class="author-row">
        <RouterLink v-if="showAuthorLink" :to="`/users/${creatorId}`" class="author-avatar-link" :aria-label="creatorLabel">
          <img v-if="creatorAvatar" :src="creatorAvatar" :alt="creatorLabel" class="author-avatar" />
          <span v-else class="author-avatar fallback">{{ creatorInitial }}</span>
        </RouterLink>
        <span v-else class="author-avatar-link static" :aria-label="creatorLabel">
          <img v-if="creatorAvatar" :src="creatorAvatar" :alt="creatorLabel" class="author-avatar" />
          <span v-else class="author-avatar fallback">{{ creatorInitial }}</span>
        </span>
        <RouterLink v-if="showAuthorLink" :to="`/users/${creatorId}`" class="author">{{ creatorLabel }}</RouterLink>
        <span v-else class="author static">{{ creatorLabel }}</span>
      </div>
      <div v-if="categoryLabels.length > 0" class="category-row">
        <span v-for="label in categoryLabels.slice(0, 3)" :key="label" class="category-pill">{{ label }}</span>
      </div>
      <div class="meta">
        <div v-if="formattedTime" class="meta-leading">
          <span class="meta-text time">{{ formattedTime }}</span>
        </div>
        <div class="meta-stats">
          <span class="stat-item" title="浏览量" aria-label="浏览量">
            <el-icon class="meta-icon"><View /></el-icon>
            {{ formattedPlayCount }}
          </span>
          <span class="stat-item" title="点赞数" aria-label="点赞数">
            <svg class="meta-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M7 22V11L10.5 3.5C10.78 2.87 11.41 2.5 12.1 2.5C13.1 2.5 13.85 3.42 13.65 4.4L12.8 9H20c1.1 0 2 .9 2 2v1c0 .15-.02.3-.05.44l-2.19 8C19.5 21.35 18.68 22 17.73 22H7ZM3 22h2V11H3v11Z" />
            </svg>
            {{ formattedLikeCount }}
          </span>
          <span class="stat-item" title="收藏数" aria-label="收藏数">
            <el-icon class="meta-icon"><Star /></el-icon>
            {{ formattedFavoriteCount }}
          </span>
          <span class="stat-item" title="投币数" aria-label="投币数">
            <el-icon class="meta-icon"><Coin /></el-icon>
            {{ formattedCoinCount }}
          </span>
        </div>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { Coin, Star, View } from '@element-plus/icons-vue';

import { formatVideoCategoryLabels } from '@/constants/categories';
import type { VideoCard } from '@/types/api';

const props = defineProps<{
  item: VideoCard;
  hoverPreview?: boolean;
  disableAuthorLink?: boolean;
}>();

const previewVideoRef = ref<HTMLVideoElement | null>(null);
const isPreviewing = ref(false);
const previewReady = ref(false);

const hasHoverPreview = computed(() => Boolean(props.hoverPreview && props.item.playUrl));
const creatorId = computed(() => props.item.creator?.id ?? props.item.creatorId ?? null);
const creatorLabel = computed(() => props.item.creator?.nickname ?? `用户 #${creatorId.value ?? '-'}`);
const creatorAvatar = computed(() => props.item.creator?.avatarUrl ?? '');
const creatorInitial = computed(() => creatorLabel.value.trim().slice(0, 1).toUpperCase() || 'U');
const showAuthorLink = computed(() => Boolean(creatorId.value) && !props.disableAuthorLink);
const formattedPlayCount = computed(() => formatCount(props.item.playCount ?? 0));
const formattedLikeCount = computed(() => formatCount(props.item.likeCount ?? 0));
const formattedFavoriteCount = computed(() => formatCount(props.item.favoriteCount ?? 0));
const formattedCoinCount = computed(() => formatCount(props.item.coinCount ?? 0));
const durationLabel = computed(() => formatDuration(props.item.durationSeconds));
const categoryLabels = computed(() => formatVideoCategoryLabels(props.item));

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

function formatCount(value: number) {
  if (value >= 10000) {
    return `${(value / 10000).toFixed(value >= 100000 ? 0 : 1)}万`;
  }

  return String(value);
}

function formatDuration(value?: number | null) {
  if (!value || value <= 0) {
    return '';
  }

  const total = Math.floor(value);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

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
  min-width: 0;
  padding: 0 0 12px;
  border-radius: 10px;
  background: #ffffff;
  border: 1px solid #eef2f7;
  box-shadow: 0 10px 26px rgba(15, 23, 42, 0.045);
  overflow: hidden;
  cursor: pointer;
  transition:
    transform 0.28s cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 0.28s cubic-bezier(0.16, 1, 0.3, 1),
    border-color 0.28s ease;
}

.card:hover {
  transform: translateY(-5px);
  border-color: #dbe8ff;
  box-shadow: 0 20px 42px rgba(15, 23, 42, 0.11);
}

.cover-wrap {
  position: relative;
  display: block;
  text-decoration: none;
  aspect-ratio: 16 / 9;
  border-radius: 9px 9px 0 0;
  overflow: hidden;
  background: #eef2f7;
}

.cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition:
    opacity 0.22s ease,
    transform 0.42s cubic-bezier(0.16, 1, 0.3, 1);
}

.cover-preview {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.22s ease, transform 0.42s cubic-bezier(0.16, 1, 0.3, 1);
}

.card:hover .cover,
.card:hover .cover-preview {
  transform: scale(1.035);
}

.cover-wrap.is-previewing .cover {
  opacity: 0;
}

.cover-wrap.is-previewing .cover-preview {
  opacity: 1;
}

.duration-badge {
  position: absolute;
  right: 10px;
  bottom: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 48px;
  height: 24px;
  padding: 0 8px;
  border-radius: 7px;
  background: rgba(15, 23, 42, 0.72);
  color: #ffffff;
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  backdrop-filter: blur(6px);
}

.card-info {
  display: grid;
  gap: 7px;
  padding: 11px 12px 0;
}

.title-link {
  color: inherit;
  text-decoration: none;
}

.title {
  min-height: 42px;
  margin: 0;
  color: #131925;
  font-size: 15px;
  font-weight: 760;
  line-height: 1.42;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.author-row {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
}

.author-avatar-link {
  display: inline-flex;
  flex: 0 0 auto;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  text-decoration: none;
}

.author-avatar {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  object-fit: cover;
  background: #e8edf5;
}

.author-avatar.fallback {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  background: linear-gradient(135deg, #6b7a90, #2f6fed);
  font-size: 11px;
  font-weight: 800;
}

.meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 6px 10px;
  min-height: 20px;
  font-size: 12px;
  color: #8a95a8;
  line-height: 1.2;
}

.meta-leading {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  flex: 0 0 auto;
}

.meta-text {
  white-space: nowrap;
}

.meta-stats {
  display: inline-flex;
  align-items: center;
  gap: 8px 10px;
  margin-left: auto;
  flex: 0 0 auto;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.stat-item {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  white-space: nowrap;
}

.meta-icon {
  width: 13px;
  height: 13px;
  color: #8a95a8;
}

.category-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  min-height: 20px;
}

.category-pill {
  display: inline-flex;
  align-items: center;
  height: 20px;
  padding: 0 7px;
  border-radius: 7px;
  background: var(--color-primary-light);
  color: var(--color-primary);
  font-size: 11px;
  font-weight: 750;
  line-height: 1;
}

.author {
  min-width: 0;
  color: #5f6b7a;
  text-decoration: none;
  font-size: 12px;
  font-weight: 650;
  line-height: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color 0.15s;
}

.author:hover {
  color: #2f6fed;
}

.author.static {
  color: #5f6b7a;
}

.time {
  color: #8a95a8;
}

.dot {
  color: #c3cad5;
}
</style>
