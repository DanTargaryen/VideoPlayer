<template>
  <section class="page">
    <template v-if="loading">
      <LoadingSplash fullPage />
    </template>

    <template v-else>
      <section
        v-if="carousel.length > 0"
        class="hero-shell"
        data-tour="home-hero"
        aria-label="热门推荐轮播"
        @mouseenter="stopCarouselTimer"
        @mouseleave="startCarouselTimer"
      >
        <div class="hero-main">
          <article v-if="activeCarouselItem" :key="activeCarouselItem.id" class="hero-card">
            <RouterLink :to="`/video/${activeCarouselItem.id}`" class="hero-media" :aria-label="activeCarouselItem.title">
              <video
                v-if="activeCarouselItem.playUrl"
                class="hero-video"
                :src="activeCarouselItem.playUrl"
                :poster="activeCarouselItem.coverUrl"
                muted
                loop
                autoplay
                playsinline
                preload="metadata"
              ></video>
              <img v-else :src="activeCarouselItem.coverUrl" :alt="activeCarouselItem.title" class="hero-cover" />
            </RouterLink>

            <div class="hero-wash"></div>
            <div class="hero-copy">
              <span class="hero-badge">热门推荐</span>
              <h1 class="hero-title">{{ activeCarouselItem.title }}</h1>
              <p class="hero-desc">
                {{ activeCarouselItem.description || '发现创作者带来的精选视频内容，开启沉浸式观看体验。' }}
              </p>
              <div class="hero-tags" aria-label="内容标签">
                <span v-for="tag in heroTags" :key="tag">{{ tag }}</span>
              </div>
              <div class="hero-actions">
                <RouterLink :to="`/video/${activeCarouselItem.id}`" class="hero-play">
                  <span class="play-triangle"></span>
                  <span>立即播放</span>
                </RouterLink>
              </div>
            </div>
          </article>

          <button
            v-if="carousel.length > 1"
            type="button"
            class="carousel-btn prev"
            aria-label="上一条推荐"
            @click="prevCarousel"
          >
            <el-icon :size="20"><ArrowLeft /></el-icon>
          </button>
          <button
            v-if="carousel.length > 1"
            type="button"
            class="carousel-btn next"
            aria-label="下一条推荐"
            @click="nextCarousel"
          >
            <el-icon :size="20"><ArrowRight /></el-icon>
          </button>

          <div v-if="carousel.length > 1" class="carousel-dots">
            <button
              v-for="(_, idx) in carousel"
              :key="idx"
              type="button"
              class="dot"
              :class="{ active: idx === carouselIndex }"
              :aria-label="`切换到第 ${idx + 1} 条推荐`"
              @click="goToCarousel(idx)"
            ></button>
          </div>
        </div>

        <aside class="hero-side-list" aria-label="右侧推荐列表">
          <button
            v-for="item in sideRecommendationCards"
            :key="item.id"
            type="button"
            class="side-card"
            :class="{ active: item.id === activeCarouselItem?.id }"
            @click="goToCarouselById(item.id)"
          >
            <span class="side-cover-wrap">
              <img :src="item.coverUrl" :alt="item.title" class="side-cover" />
              <span v-if="formatDuration(item.durationSeconds)" class="side-duration">
                {{ formatDuration(item.durationSeconds) }}
              </span>
            </span>
            <span class="side-info">
              <strong>{{ item.title }}</strong>
              <span>{{ item.creator?.nickname ?? '观澜创作者' }}</span>
              <span class="side-meta">
                <span class="mini-play"></span>
                {{ formatCount(item.playCount ?? 0) }}
              </span>
            </span>
          </button>
        </aside>
      </section>

      <section class="category-shell" aria-label="内容分类" data-tour="home-category">
        <div class="category-rail">
          <button
            v-for="category in categoryTabs"
            :key="category.code"
            type="button"
            class="category-pill"
            :class="{ active: category.code === activeCategoryCode }"
            @click="selectCategory(category.code)"
          >
            {{ category.label }}
          </button>
        </div>
      </section>

      <div class="section-head">
        <div class="section-title-wrap">
          <span class="section-rule"></span>
          <h2 class="section-title">为你推荐</h2>
          <span class="section-subtitle">根据你的观看兴趣持续更新</span>
        </div>
        <button type="button" class="refresh-btn" :disabled="refreshingFeed" @click="refreshFeed">
          <span>换一换</span>
          <el-icon :size="15" :class="{ spinning: refreshingFeed }"><RefreshRight /></el-icon>
        </button>
      </div>

      <template v-if="cards.length > 0">
        <div class="cards" aria-label="为你推荐视频流" data-tour="home-recommend-list">
          <VideoMediaCard
            v-for="card in cards"
            :key="card.id"
            :item="card"
            hover-preview
            disable-author-link
          />
        </div>

        <div ref="loadMoreSentinel" class="feed-status" aria-live="polite">
          <template v-if="loadingMore">
            <span class="loading-mark"></span>
            <span>正在加载更多精彩内容...</span>
          </template>
          <template v-else-if="!hasMore">
            <span>没有更多内容啦</span>
          </template>
          <template v-else>
            <span>继续下滑发现更多推荐</span>
          </template>
        </div>
      </template>

      <div v-else class="home-empty">
        <el-empty description="当前分类下暂时没有找到视频" />
        <button type="button" class="empty-reset" @click="selectCategory('all')">返回全部推荐</button>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import {
  ArrowLeft,
  ArrowRight,
  RefreshRight,
} from '@element-plus/icons-vue';

import LoadingSplash from '@/components/LoadingSplash.vue';
import VideoMediaCard from '@/components/VideoMediaCard.vue';
import { fetchRecommendFeed, searchAll } from '@/api/platform';
import type { VideoCard } from '@/types/api';
import { mergeUniqueById, takeRandomItems } from '@/utils/randomVideos';

interface HomeCategory {
  code: string;
  label: string;
  apiCode?: string;
  keyword?: string;
}

const categoryTabs: HomeCategory[] = [
  { code: 'all', label: '全部' },
  { code: 'entertainment', label: '娱乐', apiCode: 'entertainment' },
  { code: 'tech', label: '科技', apiCode: 'tech' },
  { code: 'animation', label: '动画', apiCode: 'animation' },
  { code: 'game', label: '游戏', apiCode: 'game' },
  { code: 'life', label: '生活', apiCode: 'life' },
  { code: 'study', label: '学习', apiCode: 'study' },
  { code: 'music', label: '音乐', apiCode: 'music' },
  { code: 'film', label: '影视', apiCode: 'film' },
  { code: 'sports', label: '运动', apiCode: 'sports' },
  { code: 'comedy', label: '搞笑', apiCode: 'comedy' },
  { code: 'food', label: '美食', apiCode: 'food' },
  { code: 'travel', label: '旅行', apiCode: 'travel' },
];

const loading = ref(true);
const cards = ref<VideoCard[]>([]);
const carousel = ref<VideoCard[]>([]);
const carouselIndex = ref(0);
const refreshingFeed = ref(false);
const loadingMore = ref(false);
const hasMore = ref(true);
const activeCategoryCode = ref('all');
const currentPage = ref(0);
const loadMoreSentinel = ref<HTMLElement | null>(null);

const FEED_PAGE_SIZE = 12;
const INITIAL_PAGE_COUNT = 2;
const FEED_CAROUSEL_SIZE = 5;

let carouselTimer: number | null = null;
let feedRequestId = 0;
let observer: IntersectionObserver | null = null;

const activeCategory = computed(() => {
  return categoryTabs.find((item) => item.code === activeCategoryCode.value) ?? categoryTabs[0];
});

const activeCarouselItem = computed(() => carousel.value[carouselIndex.value] ?? carousel.value[0]);

const heroTags = computed(() => {
  const label = activeCategory.value.label;
  if (activeCategory.value.code === 'tech') {
    return ['科技', '机器人', 'AI', '未来世界'];
  }
  if (activeCategory.value.code === 'all') {
    return ['精选', '创作者', '热门内容', '持续更新'];
  }
  return [label, '精选内容', '热门视频', '观澜推荐'];
});

const sideRecommendationCards = computed(() => {
  const active = activeCarouselItem.value;
  const activeId = active?.id;
  const withoutActive = carousel.value.filter((item) => item.id !== activeId);
  return (active ? [active, ...withoutActive] : withoutActive).slice(0, 4);
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

function resetCarouselPosition() {
  carouselIndex.value = 0;
}

function nextCarousel() {
  const total = carousel.value.length;
  if (total <= 1) return;
  carouselIndex.value = (carouselIndex.value + 1) % total;
}

function prevCarousel() {
  const total = carousel.value.length;
  if (total <= 1) return;
  carouselIndex.value = (carouselIndex.value - 1 + total) % total;
}

function goToCarousel(index: number) {
  const total = carousel.value.length;
  if (total <= 1 || index < 0 || index >= total) return;
  carouselIndex.value = index;
}

function goToCarouselById(id: number) {
  const index = carousel.value.findIndex((item) => item.id === id);
  if (index >= 0) {
    goToCarousel(index);
  }
}

function startCarouselTimer() {
  stopCarouselTimer();
  if (carousel.value.length <= 1) return;
  carouselTimer = window.setInterval(() => {
    nextCarousel();
  }, 5200);
}

function stopCarouselTimer() {
  if (carouselTimer) {
    clearInterval(carouselTimer);
    carouselTimer = null;
  }
}

async function fetchCategoryPage(page: number) {
  const category = activeCategory.value;

  if (category.keyword && !category.apiCode) {
    const result = await searchAll({
      keyword: category.keyword,
      tab: 'video',
      sortBy: 'best',
      page,
      pageSize: FEED_PAGE_SIZE,
    });
    return result.video;
  }

  return fetchRecommendFeed({
    categoryCode: category.apiCode,
    page,
    pageSize: FEED_PAGE_SIZE,
  });
}

async function loadInitialFeed() {
  const requestId = ++feedRequestId;
  refreshingFeed.value = true;
  stopCarouselTimer();

  try {
    const pages = Array.from({ length: INITIAL_PAGE_COUNT }, (_, index) => index + 1);
    const results = await Promise.allSettled(pages.map((page) => fetchCategoryPage(page)));
    if (requestId !== feedRequestId) return;

    const groups = results
      .filter((result): result is PromiseFulfilledResult<VideoCard[]> => result.status === 'fulfilled')
      .map((result) => result.value);
    if (groups.length === 0) {
      throw results.find((result) => result.status === 'rejected')?.reason ?? new Error('No feed page loaded');
    }

    const candidates = mergeUniqueById(groups);
    cards.value = takeRandomItems(candidates, candidates.length);
    carousel.value = takeRandomItems(candidates, Math.min(FEED_CAROUSEL_SIZE, candidates.length));
    currentPage.value = INITIAL_PAGE_COUNT;
    hasMore.value = groups.some((group) => group.length >= FEED_PAGE_SIZE);
    resetCarouselPosition();
    startCarouselTimer();
  } catch {
    if (requestId === feedRequestId) {
      ElMessage.error('加载推荐流失败');
      cards.value = [];
      carousel.value = [];
      hasMore.value = false;
    }
  } finally {
    if (requestId === feedRequestId) {
      loading.value = false;
      refreshingFeed.value = false;
      await nextTick();
      setupInfiniteObserver();
    }
  }
}

async function loadMore() {
  if (loadingMore.value || refreshingFeed.value || !hasMore.value) {
    return;
  }

  const requestId = feedRequestId;
  loadingMore.value = true;
  try {
    const nextPage = currentPage.value + 1;
    const nextItems = await fetchCategoryPage(nextPage);
    if (requestId !== feedRequestId) return;

    const existingIds = new Set(cards.value.map((item) => item.id));
    const uniqueNextItems = nextItems.filter((item) => !existingIds.has(item.id));
    cards.value = [...cards.value, ...uniqueNextItems];
    currentPage.value = nextPage;
    hasMore.value = nextItems.length >= FEED_PAGE_SIZE && uniqueNextItems.length > 0;
  } catch {
    ElMessage.error('加载更多失败');
  } finally {
    if (requestId === feedRequestId) {
      loadingMore.value = false;
    }
  }
}

async function selectCategory(code: string) {
  if (activeCategoryCode.value === code && !refreshingFeed.value) {
    return;
  }

  activeCategoryCode.value = code;
  cards.value = [];
  carousel.value = [];
  hasMore.value = true;
  currentPage.value = 0;
  await loadInitialFeed();
}

async function refreshFeed() {
  await loadInitialFeed();
}

function setupInfiniteObserver() {
  if (observer) {
    observer.disconnect();
    observer = null;
  }

  if (!loadMoreSentinel.value) {
    return;
  }

  observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        void loadMore();
      }
    },
    { rootMargin: '420px 0px 420px 0px' },
  );

  observer.observe(loadMoreSentinel.value);
}

onMounted(async () => {
  await loadInitialFeed();
});

onUnmounted(() => {
  stopCarouselTimer();
  if (observer) {
    observer.disconnect();
    observer = null;
  }
});
</script>

<style scoped>
.page {
  --home-blue: #2f6fed;
  --home-ink: #111827;
  --home-muted: #7b8797;
  --home-line: #e9eef6;
  display: grid;
  gap: 18px;
  max-width: 1760px;
  margin: 0 auto;
  overflow-x: clip;
}

.hero-shell {
  display: grid;
  grid-template-columns: minmax(0, 2.15fr) minmax(300px, 0.98fr);
  gap: 18px;
  min-height: 398px;
}

.hero-main,
.hero-side-list {
  border: 1px solid var(--home-line);
  background: #ffffff;
  box-shadow: 0 18px 48px rgba(15, 23, 42, 0.08);
}

.hero-main {
  position: relative;
  min-width: 0;
  min-height: 398px;
  border-radius: 18px;
  overflow: hidden;
}

.hero-card,
.hero-media,
.hero-cover,
.hero-video {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
}

.hero-card {
  animation: heroFade 0.36s cubic-bezier(0.16, 1, 0.3, 1);
}

.hero-cover,
.hero-video {
  object-fit: cover;
  object-position: center;
}

.hero-wash {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(90deg, rgba(247, 251, 255, 0.96) 0%, rgba(247, 251, 255, 0.82) 35%, rgba(247, 251, 255, 0.26) 62%, rgba(247, 251, 255, 0) 100%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.38), rgba(255, 255, 255, 0.1));
}

.hero-copy {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  width: min(560px, 56%);
  min-height: 100%;
  padding: clamp(46px, 4vw, 66px) clamp(48px, 4.8vw, 74px);
  color: var(--home-ink);
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 0 18px;
  border-radius: 999px;
  background: var(--home-blue);
  color: #ffffff;
  font-size: 14px;
  font-weight: 800;
  line-height: 1;
  box-shadow: 0 12px 24px rgba(47, 111, 237, 0.2);
}

.hero-title {
  margin: 18px 0 0;
  color: #101725;
  font-size: clamp(34px, 3vw, 50px);
  font-weight: 900;
  line-height: 1.08;
  letter-spacing: 0;
  display: -webkit-box;
  max-width: 100%;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.hero-desc {
  margin: 12px 0 0;
  max-width: 560px;
  color: #344054;
  font-size: clamp(15px, 1.05vw, 18px);
  font-weight: 650;
  line-height: 1.58;
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.hero-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 20px;
}

.hero-tags span {
  height: 30px;
  padding: 0 15px;
  border-radius: 999px;
  background: rgba(239, 244, 251, 0.92);
  color: #5d6b7e;
  font-size: 13px;
  font-weight: 760;
  line-height: 30px;
}

.hero-actions {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-top: 24px;
}

.hero-play,
.hero-add,
.carousel-btn,
.side-card,
.category-pill,
.refresh-btn,
.empty-reset {
  transition:
    transform 0.26s cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 0.26s cubic-bezier(0.16, 1, 0.3, 1),
    background 0.22s ease,
    border-color 0.22s ease,
    color 0.22s ease;
}

.hero-play {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-width: 196px;
  height: 54px;
  padding: 0 26px;
  border-radius: 999px;
  background: var(--home-blue);
  color: #ffffff;
  font-size: 17px;
  font-weight: 850;
  text-decoration: none;
  box-shadow: 0 16px 30px rgba(47, 111, 237, 0.24);
}

.hero-play:hover {
  transform: translateY(-2px);
  background: #255fd7;
}

.hero-play:active,
.hero-add:active,
.carousel-btn:active,
.side-card:active,
.category-pill:active,
.refresh-btn:active,
.empty-reset:active {
  transform: translateY(-1px) scale(0.98);
}

.play-triangle {
  width: 0;
  height: 0;
  border-top: 9px solid transparent;
  border-bottom: 9px solid transparent;
  border-left: 13px solid currentColor;
}

.hero-add {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 54px;
  height: 54px;
  border-radius: 50%;
  border: 1px solid #dce5f2;
  background: rgba(255, 255, 255, 0.86);
  color: #26364c;
  cursor: pointer;
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08);
}

.hero-add:hover {
  border-color: #cbdaf0;
  color: var(--home-blue);
  transform: translateY(-2px);
}

.carousel-btn {
  position: absolute;
  z-index: 2;
  top: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border: 1px solid #e0e7f1;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.78);
  color: #5f6b7a;
  cursor: pointer;
  transform: translateY(-50%);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(12px);
}

.carousel-btn:hover {
  color: var(--home-blue);
  background: #ffffff;
  transform: translateY(-50%) scale(1.04);
}

.carousel-btn.prev {
  left: 18px;
}

.carousel-btn.next {
  right: 18px;
}

.carousel-dots {
  position: absolute;
  z-index: 2;
  left: 50%;
  bottom: 24px;
  display: flex;
  gap: 9px;
  transform: translateX(-50%);
}

.dot {
  width: 9px;
  height: 9px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: rgba(120, 139, 165, 0.35);
  cursor: pointer;
  transition: width 0.22s ease, background 0.22s ease;
}

.dot.active {
  width: 28px;
  background: var(--home-blue);
}

.hero-side-list {
  display: grid;
  align-content: start;
  gap: 10px;
  min-width: 0;
  padding: 16px;
  border-radius: 18px;
}

.side-card {
  display: grid;
  grid-template-columns: 144px minmax(0, 1fr);
  align-items: center;
  gap: 14px;
  min-width: 0;
  height: 76px;
  padding: 8px;
  border: 1px solid transparent;
  border-radius: 12px;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.side-card:hover,
.side-card.active {
  background: #f3f7ff;
  border-color: #e3ecff;
  transform: translateX(-2px);
}

.side-cover-wrap {
  position: relative;
  display: block;
  width: 144px;
  aspect-ratio: 16 / 9;
  border-radius: 9px;
  overflow: hidden;
  background: #eef2f7;
}

.side-cover {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.side-duration {
  position: absolute;
  right: 6px;
  bottom: 6px;
  min-width: 42px;
  height: 22px;
  padding: 0 7px;
  border-radius: 7px;
  background: rgba(15, 23, 42, 0.72);
  color: #ffffff;
  font-size: 12px;
  font-weight: 760;
  line-height: 22px;
  text-align: center;
}

.side-info {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.side-info strong {
  color: #171f2d;
  font-size: 15px;
  font-weight: 820;
  line-height: 1.24;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.side-info span {
  min-width: 0;
  color: #7b8797;
  font-size: 12px;
  font-weight: 650;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.side-meta {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

.mini-play {
  width: 0;
  height: 0;
  border-top: 5px solid transparent;
  border-bottom: 5px solid transparent;
  border-left: 7px solid currentColor;
}

.category-shell {
  display: block;
}

.category-rail {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
  overflow-x: auto;
  padding: 2px 2px 5px;
  scrollbar-width: none;
}

.category-rail::-webkit-scrollbar {
  display: none;
}

.category-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 38px;
  padding: 0 22px;
  border: 1px solid #e3e9f2;
  border-radius: 999px;
  background: #ffffff;
  color: #253044;
  font-size: 14px;
  font-weight: 760;
  white-space: nowrap;
  cursor: pointer;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.035);
}

.category-pill:hover {
  color: var(--home-blue);
  border-color: #cfe0ff;
}

.category-pill.active {
  color: #ffffff;
  background: var(--home-blue);
  border-color: var(--home-blue);
  box-shadow: 0 12px 24px rgba(47, 111, 237, 0.2);
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin-top: 2px;
}

.section-title-wrap {
  display: flex;
  align-items: baseline;
  gap: 12px;
  min-width: 0;
}

.section-rule {
  align-self: center;
  width: 4px;
  height: 26px;
  border-radius: 999px;
  background: var(--home-blue);
}

.section-title {
  margin: 0;
  color: #111827;
  font-size: 26px;
  font-weight: 900;
  line-height: 1;
  letter-spacing: 0;
}

.section-subtitle {
  color: #8a95a8;
  font-size: 14px;
  font-weight: 650;
}

.refresh-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 36px;
  padding: 0 14px;
  border: 1px solid transparent;
  border-radius: 999px;
  background: transparent;
  color: #26364c;
  font-size: 14px;
  font-weight: 760;
  cursor: pointer;
}

.refresh-btn:hover {
  color: var(--home-blue);
  background: #f3f7ff;
}

.refresh-btn:disabled {
  cursor: not-allowed;
  opacity: 0.72;
}

.spinning {
  animation: spin 0.9s linear infinite;
}

.cards {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;
}

.feed-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 48px;
  color: #8a95a8;
  font-size: 14px;
  font-weight: 650;
}

.loading-mark {
  width: 18px;
  height: 18px;
  border: 2px solid #d8e5ff;
  border-top-color: var(--home-blue);
  border-radius: 50%;
  animation: spin 0.85s linear infinite;
}

.home-empty {
  display: grid;
  justify-items: center;
  gap: 10px;
  padding: 56px 0 72px;
}

.empty-reset {
  height: 38px;
  padding: 0 18px;
  border: 1px solid #dce7f8;
  border-radius: 999px;
  background: #ffffff;
  color: var(--home-blue);
  font-weight: 760;
  cursor: pointer;
}

.empty-reset:hover {
  background: #f3f7ff;
  transform: translateY(-2px);
}

@keyframes heroFade {
  from {
    opacity: 0.2;
    transform: scale(1.01);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 1320px) {
  .hero-shell {
    grid-template-columns: minmax(0, 1.7fr) minmax(300px, 0.9fr);
  }

  .side-card {
    grid-template-columns: 124px minmax(0, 1fr);
  }

  .side-cover-wrap {
    width: 124px;
  }
}

@media (max-width: 1080px) {
  .hero-shell {
    grid-template-columns: 1fr;
  }

  .hero-side-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .page {
    gap: 16px;
  }

  .hero-shell {
    min-height: auto;
  }

  .hero-main {
    min-height: 372px;
    border-radius: 14px;
  }

  .hero-wash {
    background:
      linear-gradient(180deg, rgba(247, 251, 255, 0.96) 0%, rgba(247, 251, 255, 0.78) 58%, rgba(247, 251, 255, 0.3) 100%),
      linear-gradient(90deg, rgba(247, 251, 255, 0.92), rgba(247, 251, 255, 0.2));
  }

  .hero-cover,
  .hero-video {
    object-position: center bottom;
  }

  .hero-copy {
    width: 100%;
    padding: 32px 26px;
  }

  .hero-title {
    font-size: 31px;
  }

  .hero-desc {
    font-size: 15px;
  }

  .hero-play {
    min-width: 156px;
    height: 48px;
    font-size: 15px;
  }

  .hero-add {
    width: 48px;
    height: 48px;
  }

  .hero-side-list {
    grid-template-columns: 1fr;
    padding: 12px;
    border-radius: 14px;
  }

  .section-head {
    align-items: flex-start;
  }

  .section-title-wrap {
    flex-wrap: wrap;
    row-gap: 8px;
  }

  .section-subtitle {
    flex-basis: 100%;
    padding-left: 16px;
  }
}

@media (max-width: 560px) {
  .cards {
    grid-template-columns: 1fr;
  }

  .side-card {
    grid-template-columns: 118px minmax(0, 1fr);
  }

  .side-cover-wrap {
    width: 118px;
  }

  .category-pill {
    padding: 0 17px;
  }
}
</style>
