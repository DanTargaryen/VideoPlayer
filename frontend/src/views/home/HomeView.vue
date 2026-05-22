<template>
  <section class="page">
    <template v-if="loading">
      <LoadingSplash fullPage />
    </template>
    <template v-else>
      <div class="section-head">
        <div class="section-title-wrap">
          <span class="section-icon">
            <el-icon :size="22"><StarFilled /></el-icon>
          </span>
          <span class="section-eyebrow">For You</span>
          <h2 class="section-title">推荐视频</h2>
        </div>
        <el-button type="primary" size="small" :loading="refreshingFeed" @click="loadFeed">
          <el-icon><RefreshRight /></el-icon>
          <span>刷新推荐</span>
        </el-button>
      </div>

      <template v-if="cards.length > 0">
        <div class="featured-row" v-if="carousel.length > 0">
          <div class="carousel-area">
            <div class="carousel-wrapper">
              <div class="carousel-track" :style="carouselTrackStyle" @transitionend="handleCarouselTransitionEnd">
                <RouterLink
                  v-for="(item, idx) in carouselViewportItems"
                  :key="`${item.id}-${idx}`"
                  :to="`/video/${item.id}`"
                  class="carousel-slide"
                >
                  <img
                    :src="item.coverUrl"
                    :alt="item.title"
                    class="carousel-cover"
                    crossorigin="anonymous"
                    @load="(e) => extractColor(item.id, e)"
                  />
                  <div
                    class="carousel-gradient"
                    :style="{ background: gradientStyles[item.id] || defaultGradient }"
                  >
                    <div class="carousel-info">
                      <h3 class="carousel-title">{{ item.title }}</h3>
                      <p class="carousel-desc">{{ item.description }}</p>
                      <div class="carousel-meta">
                        <span class="meta-creator">{{ item.creator?.nickname ?? '匿名' }}</span>
                        <span class="meta-stats">
                          <svg class="stat-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 5C6.79 5 3.1 8.26 1.82 12c1.28 3.74 4.97 7 10.18 7s8.9-3.26 10.18-7C20.9 8.26 17.21 5 12 5Zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm0-2.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"/></svg>
                          {{ item.playCount ?? 0 }}
                        </span>
                        <span class="meta-stats">
                          <svg class="stat-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M7 22V11L10.5 3.5C10.78 2.87 11.41 2.5 12.1 2.5C13.1 2.5 13.85 3.42 13.65 4.4L12.8 9H20c1.1 0 2 0.9 2 2v1c0 .15-.02.3-.05.44l-2.19 8C19.5 21.35 18.68 22 17.73 22H7ZM7 13v8M3 22h2V11H3v11Z"/></svg>
                          {{ item.likeCount }}
                        </span>
                        <span class="meta-stats">
                          <svg class="stat-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                          {{ item.favoriteCount }}
                        </span>
                      </div>
                    </div>
                  </div>
                </RouterLink>
              </div>
              <div class="carousel-dots" v-if="carousel.length > 1">
                <span
                  v-for="(_, idx) in carousel"
                  :key="idx"
                  class="dot"
                  :class="{ active: idx === carouselIndex }"
                  @click="goToCarousel(idx)"
                ></span>
              </div>
              <button
                v-if="carousel.length > 1"
                class="carousel-btn prev"
                @click="prevCarousel"
              >‹</button>
              <button
                v-if="carousel.length > 1"
                class="carousel-btn next"
                @click="nextCarousel"
              >›</button>
            </div>
          </div>

          <div class="featured-cards">
            <VideoMediaCard v-for="card in topRightCards" :key="card.id" :item="card" hover-preview show-play-count disable-author-link />
          </div>
        </div>

        <div class="cards">
          <VideoMediaCard v-for="card in restCards" :key="card.id" :item="card" hover-preview show-play-count disable-author-link />
        </div>
      </template>

      <el-empty v-else description="当前条件下没有找到相关视频" />
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { RefreshRight, StarFilled } from '@element-plus/icons-vue';

import LoadingSplash from '@/components/LoadingSplash.vue';
import VideoMediaCard from '@/components/VideoMediaCard.vue';
import { fetchRecommendFeed } from '@/api/platform';
import type { VideoCard } from '@/types/api';
import { mergeUniqueById, takeRandomItems } from '@/utils/randomVideos';

const loading = ref(true);
const cards = ref<VideoCard[]>([]);
const carousel = ref<VideoCard[]>([]);
const carouselIndex = ref(0);
const carouselTrackIndex = ref(0);
const carouselTransitionEnabled = ref(false);
const refreshingFeed = ref(false);
let carouselTimer: number | null = null;

const FEED_PAGE_SIZE = 20;
const FEED_DISPLAY_SIZE = 20;
const FEED_CANDIDATE_PAGES = 6;
const FEED_CAROUSEL_SIZE = 5;

const gradientStyles = ref<Record<number, string>>({});
const defaultGradient = 'linear-gradient(to bottom, transparent 0%, rgba(30, 30, 30, 0.95) 100%)';

const carouselViewportItems = computed(() => {
  if (carousel.value.length <= 1) {
    return carousel.value;
  }

  const first = carousel.value[0];
  const last = carousel.value[carousel.value.length - 1];
  return [last, ...carousel.value, first];
});

const carouselTrackStyle = computed(() => ({
  transform: `translateX(-${carouselTrackIndex.value * 100}%)`,
  transition:
    carousel.value.length > 1 && carouselTransitionEnabled.value
      ? 'transform 0.45s ease'
      : 'none',
}));

function extractColor(videoId: number, event: Event) {
  const img = event.target as HTMLImageElement;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = 100;
  canvas.height = 50;

  try {
    ctx.drawImage(img, 0, img.naturalHeight - 100, img.naturalWidth, 100, 0, 0, 100, 50);
    const imageData = ctx.getImageData(0, 40, 100, 10);
    const data = imageData.data;

    let r = 0, g = 0, b = 0, count = 0;
    for (let i = 0; i < data.length; i += 4) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      count++;
    }

    r = Math.round(r / count);
    g = Math.round(g / count);
    b = Math.round(b / count);

    const darken = (v: number) => Math.max(0, Math.round(v * 0.6));
    const darkR = darken(r);
    const darkG = darken(g);
    const darkB = darken(b);

    gradientStyles.value[videoId] = `linear-gradient(to bottom, transparent 0%, rgba(${r}, ${g}, ${b}, 0.85) 40%, rgba(${darkR}, ${darkG}, ${darkB}, 0.98) 100%)`;
  } catch {
    // CORS or other error, use default gradient
  }
}

const topRightCards = computed(() => cards.value.slice(0, 4));
const restCards = computed(() => cards.value.slice(4));

function resetCarouselPosition() {
  carouselIndex.value = 0;
  carouselTransitionEnabled.value = false;
  carouselTrackIndex.value = carousel.value.length > 1 ? 1 : 0;
}

function nextCarousel() {
  const total = carousel.value.length;
  if (total <= 1) return;

  carouselTransitionEnabled.value = true;
  carouselTrackIndex.value += 1;
  carouselIndex.value = (carouselIndex.value + 1) % total;
}

function prevCarousel() {
  const total = carousel.value.length;
  if (total <= 1) return;

  carouselTransitionEnabled.value = true;
  carouselTrackIndex.value -= 1;
  carouselIndex.value = (carouselIndex.value - 1 + total) % total;
}

function goToCarousel(index: number) {
  const total = carousel.value.length;
  if (total <= 1 || index === carouselIndex.value || index < 0 || index >= total) return;

  carouselTransitionEnabled.value = true;
  carouselIndex.value = index;
  carouselTrackIndex.value = index + 1;
}

function handleCarouselTransitionEnd() {
  const total = carousel.value.length;
  if (total <= 1) return;

  if (carouselTrackIndex.value === 0) {
    carouselTransitionEnabled.value = false;
    carouselTrackIndex.value = total;
    return;
  }

  if (carouselTrackIndex.value === total + 1) {
    carouselTransitionEnabled.value = false;
    carouselTrackIndex.value = 1;
  }
}

function startCarouselTimer() {
  stopCarouselTimer();
  if (carousel.value.length <= 1) return;
  carouselTimer = window.setInterval(() => {
    nextCarousel();
  }, 5000);
}

function stopCarouselTimer() {
  if (carouselTimer) {
    clearInterval(carouselTimer);
    carouselTimer = null;
  }
}

async function fetchFeedPage(page: number) {
  return fetchRecommendFeed({ page, pageSize: FEED_PAGE_SIZE });
}

async function fetchFeedCandidates() {
  const pages = Array.from({ length: FEED_CANDIDATE_PAGES }, (_, index) => index + 1);
  const groups = await Promise.all(pages.map((page) => fetchFeedPage(page)));
  return mergeUniqueById(groups);
}

async function loadFeed() {
  if (refreshingFeed.value) {
    return;
  }

  refreshingFeed.value = true;
  try {
    stopCarouselTimer();
    gradientStyles.value = {};
    const candidates = await fetchFeedCandidates();
    cards.value = takeRandomItems(candidates, FEED_DISPLAY_SIZE);
    carousel.value = takeRandomItems(cards.value, Math.min(FEED_CAROUSEL_SIZE, Math.max(3, cards.value.length)));
    resetCarouselPosition();
    startCarouselTimer();
  } catch {
    ElMessage.error('加载推荐流失败');
  } finally {
    loading.value = false;
    refreshingFeed.value = false;
  }
}

onMounted(async () => {
  await loadFeed();
});

onUnmounted(() => {
  stopCarouselTimer();
});
</script>

<style scoped>
.page {
  display: grid;
  gap: 24px;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.section-title-wrap {
  display: grid;
  grid-template-columns: auto 1fr;
  column-gap: 12px;
  align-items: center;
}

.section-icon {
  grid-row: span 2;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  border-radius: 14px;
  color: #fff;
  background: var(--theme-title-gradient, linear-gradient(135deg, #2563eb, #14b8a6));
  box-shadow: 0 12px 28px var(--theme-soft-strong, rgba(37, 99, 235, 0.18));
}

.section-title {
  margin: 0;
  width: fit-content;
  color: transparent;
  background: var(--theme-title-gradient, linear-gradient(135deg, #2563eb, #14b8a6));
  -webkit-background-clip: text;
  background-clip: text;
  font-family: "STKaiti", "KaiTi", "Microsoft YaHei", sans-serif;
  font-size: 30px;
  font-weight: 900;
  text-shadow: 0 10px 22px var(--theme-soft-strong, rgba(37, 99, 235, 0.18));
}

.section-eyebrow {
  display: inline-flex;
  margin-bottom: 4px;
  color: var(--theme-accent, #2563eb);
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.featured-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 18px;
}

.carousel-area {
  grid-column: 1 / 3;
  grid-row: 1 / 3;
  position: relative;
  align-self: center;
}

.carousel-wrapper {
  position: relative;
  overflow: hidden;
  border-radius: 9px;
  background: #1a1a1a;
  border: 1px solid rgba(15, 23, 42, 0.08);
  box-shadow: 0 4px 24px rgba(15, 23, 42, 0.06);
  aspect-ratio: 4 / 3;
}

.carousel-track {
  display: flex;
  width: 100%;
  height: 100%;
}

.carousel-slide {
  display: block;
  text-decoration: none;
  position: relative;
  width: 100%;
  min-width: 100%;
  flex: 0 0 100%;
  height: 100%;
}

.carousel-cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.carousel-gradient {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 60px 28px 28px;
  color: #fff;
}

.carousel-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.carousel-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #fff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.carousel-desc {
  margin: 0;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.5;
}

.carousel-meta {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.75);
  margin-top: 4px;
}

.meta-creator {
  font-weight: 500;
}

.meta-stats {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.stat-icon {
  width: 14px;
  height: 14px;
  opacity: 0.9;
}

.carousel-dots {
  position: absolute;
  bottom: 14px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
  z-index: 5;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.4);
  cursor: pointer;
  transition: background 0.2s;
}

.dot.active {
  background: #fff;
}

.carousel-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.7);
  color: #374151;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  z-index: 5;
  transition: background 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.carousel-btn:hover {
  background: rgba(255, 255, 255, 0.95);
}

.carousel-btn.prev {
  left: 12px;
}

.carousel-btn.next {
  right: 12px;
}

.featured-cards {
  display: contents;
}

.cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 18px;
}
</style>
