<template>
  <section class="dynamic-page">
    <header class="dynamic-hero">
      <div>
        <h1>动态</h1>
        <p>查看你关注的创作者最近发布的内容。</p>
      </div>
      <el-button type="primary" :loading="loading" @click="reloadPage">
        <el-icon><RefreshRight /></el-icon>
        <span>刷新动态</span>
      </el-button>
    </header>

    <p v-if="!store.isLoggedIn" class="notice-bar">登录后可查看你关注的创作者动态，当前为你展示平台最新推荐内容。</p>
    <p v-else-if="feedMeta.followingCount === 0 && !loading" class="notice-bar">
      你还没有关注任何创作者，下面是为你推荐的最新内容。
    </p>

    <div class="dynamic-layout">
      <main class="feed-column">
        <FeedTabs v-model="activeType" />

        <div v-if="loading && feedItems.length === 0" class="skeleton-list" aria-label="动态加载中">
          <article v-for="index in 3" :key="index" class="feed-skeleton">
            <div class="skeleton-head">
              <span class="skeleton-avatar"></span>
              <span class="skeleton-line short"></span>
            </div>
            <div class="skeleton-body">
              <span class="skeleton-media"></span>
              <span class="skeleton-copy"></span>
            </div>
          </article>
        </div>

        <section v-else-if="errorMessage" class="error-state">
          <h2>动态加载失败，请稍后重试</h2>
          <p>{{ errorMessage }}</p>
          <el-button type="primary" plain @click="reloadPage">重新加载</el-button>
        </section>

        <EmptyFeedState v-else-if="feedItems.length === 0" />

        <div v-else class="feed-list">
          <DynamicFeedCard
            v-for="(item, index) in feedItems"
            :key="item.id"
            :item="item"
            :index="index"
          />
          <div ref="loadMoreSentinel" class="load-more-sentinel">
            <span v-if="loadingMore">正在加载更多动态...</span>
            <span v-else-if="!hasMore">没有更多动态了</span>
          </div>
        </div>
      </main>

      <DynamicSidebar
        :live-items="sidebarLive"
        :recent-updates="recentUpdates"
        :following-users="followingUsers"
        :recommended-users="recommendedUsers"
        :loading-user-id="followingUserId"
        @follow="handleRecommendedFollow"
        @refresh-recommended="loadRecommendedUsers"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { RefreshRight } from '@element-plus/icons-vue';

import {
  followUser,
  getDynamicFeed,
  getRecentUpdates,
  getRecommendedUsers,
  getSidebarLive,
} from '@/api/feed';
import { fetchFollowing, fetchRecommendFeed } from '@/api/platform';
import DynamicFeedCard from '@/components/dynamic/DynamicFeedCard.vue';
import DynamicSidebar from '@/components/dynamic/DynamicSidebar.vue';
import EmptyFeedState from '@/components/dynamic/EmptyFeedState.vue';
import FeedTabs from '@/components/dynamic/FeedTabs.vue';
import { useAppStore } from '@/stores/app';
import type {
  DynamicFeedItem,
  DynamicFeedType,
  FollowUserItem,
  SidebarLiveItem,
  SidebarRecentUpdateItem,
  SidebarRecommendedUser,
} from '@/types/api';

const store = useAppStore();
const router = useRouter();

const activeType = ref<DynamicFeedType>('all');
const feedItems = ref<DynamicFeedItem[]>([]);
const sidebarLive = ref<SidebarLiveItem[]>([]);
const recentUpdates = ref<SidebarRecentUpdateItem[]>([]);
const followingUsers = ref<FollowUserItem[]>([]);
const recommendedUsers = ref<SidebarRecommendedUser[]>([]);
const feedMeta = reactive({
  followingCount: 0,
  followingItemCount: 0,
  recommendedItemCount: 0,
});
const page = ref(1);
const pageSize = 10;
const hasMore = ref(false);
const loading = ref(false);
const loadingMore = ref(false);
const errorMessage = ref('');
const followingUserId = ref<string>();
const loadMoreSentinel = ref<HTMLElement>();
let observer: IntersectionObserver | null = null;

async function loadFeed(reset = false) {
  if (loading.value || loadingMore.value) {
    return;
  }

  if (reset) {
    page.value = 1;
    loading.value = true;
    errorMessage.value = '';
  } else {
    if (!hasMore.value) return;
    loadingMore.value = true;
  }

  try {
    const result = await getDynamicFeed({
      type: activeType.value,
      page: page.value,
      pageSize,
    });
    const nextItems = reset ? result.list : mergeItems(feedItems.value, result.list);
    feedItems.value = nextItems;
    hasMore.value = result.hasMore;
    feedMeta.followingCount = result.meta.followingCount;
    feedMeta.followingItemCount = result.meta.followingItemCount;
    feedMeta.recommendedItemCount = result.meta.recommendedItemCount;
    page.value += 1;
  } catch (error) {
    try {
      const fallbackItems = await loadRecommendFallback(page.value);
      feedItems.value = reset ? fallbackItems : mergeItems(feedItems.value, fallbackItems);
      hasMore.value = fallbackItems.length >= pageSize;
      feedMeta.followingCount = 0;
      feedMeta.followingItemCount = 0;
      feedMeta.recommendedItemCount = feedItems.value.length;
      page.value += 1;
      errorMessage.value = '';
    } catch {
      errorMessage.value = error instanceof Error ? error.message : '网络请求异常';
    }
  } finally {
    loading.value = false;
    loadingMore.value = false;
  }
}

async function loadRecommendFallback(targetPage: number) {
  if (activeType.value === 'live') {
    return [];
  }

  const videos = await fetchRecommendFeed({
    page: targetPage,
    pageSize,
  });

  return videos.map<DynamicFeedItem>((video) => {
    const createdAt = video.publishedAt ?? video.createdAt ?? new Date().toISOString();
    return {
      id: `${activeType.value === 'post' ? 'post' : 'video'}-${video.id}`,
      type: activeType.value === 'post' ? 'post' : 'video',
      source: 'recommended',
      author: {
        id: String(video.creator?.id ?? video.creatorId ?? 0),
        username: video.creator?.nickname ?? `用户 ${video.creatorId ?? 0}`,
        avatar: video.creator?.avatarUrl ?? null,
      },
      actionText: '推荐给你',
      title: video.title,
      description: video.description,
      cover: video.coverUrl,
      images: activeType.value === 'post' ? [video.coverUrl, video.coverUrl, video.coverUrl] : undefined,
      duration: video.durationSeconds ?? undefined,
      category: formatCategory(video.category),
      createdAt,
      stats: {
        views: video.playCount ?? 0,
        likes: video.likeCount ?? 0,
        comments: video.commentCount ?? 0,
        favorites: video.favoriteCount ?? 0,
      },
    };
  });
}

async function loadSidebar() {
  await Promise.all([
    loadSidebarLive(),
    loadRecentUpdates(),
    loadRecommendedUsers(),
    loadFollowingUsers(),
  ]);
}

async function loadSidebarLive() {
  try {
    sidebarLive.value = (await getSidebarLive()).list;
  } catch {
    sidebarLive.value = [];
  }
}

async function loadRecentUpdates() {
  try {
    recentUpdates.value = (await getRecentUpdates()).list;
  } catch {
    recentUpdates.value = [];
  }
}

async function loadRecommendedUsers() {
  try {
    recommendedUsers.value = (await getRecommendedUsers()).list;
  } catch {
    recommendedUsers.value = [];
  }
}

async function loadFollowingUsers() {
  if (!store.isLoggedIn || !store.userId) {
    followingUsers.value = [];
    return;
  }

  try {
    followingUsers.value = (await fetchFollowing(store.userId)).slice(0, 5);
  } catch {
    followingUsers.value = [];
  }
}

async function reloadPage() {
  await Promise.all([loadFeed(true), loadSidebar()]);
  await nextTick();
  setupObserver();
}

async function handleRecommendedFollow(user: SidebarRecommendedUser) {
  if (!store.isLoggedIn) {
    ElMessage.warning('请先登录后关注创作者');
    await router.push('/login');
    return;
  }

  if (user.followed || followingUserId.value) {
    return;
  }

  followingUserId.value = user.userId;
  try {
    await followUser(Number(user.userId));
    recommendedUsers.value = recommendedUsers.value.map((item) =>
      item.userId === user.userId ? { ...item, followed: true } : item,
    );
    ElMessage.success('关注成功');
    await Promise.all([loadFollowingUsers(), loadRecentUpdates(), loadFeed(true)]);
  } catch {
    ElMessage.error('关注失败，请稍后重试');
  } finally {
    followingUserId.value = undefined;
  }
}

function mergeItems(current: DynamicFeedItem[], incoming: DynamicFeedItem[]) {
  const existingIds = new Set(current.map((item) => item.id));
  return [...current, ...incoming.filter((item) => !existingIds.has(item.id))];
}

function formatCategory(value?: string) {
  const labels: Record<string, string> = {
    entertainment: '娱乐',
    study: '学习',
    game: '游戏',
    tech: '科技',
  };

  return value ? labels[value] ?? value : '推荐';
}

function setupObserver() {
  observer?.disconnect();
  if (!loadMoreSentinel.value) {
    return;
  }

  observer = new IntersectionObserver(
    (entries) => {
      const [entry] = entries;
      if (entry?.isIntersecting && hasMore.value && !loading.value && !loadingMore.value) {
        void loadFeed(false);
      }
    },
    { rootMargin: '420px 0px' },
  );
  observer.observe(loadMoreSentinel.value);
}

watch(activeType, () => {
  void loadFeed(true).then(() => nextTick(setupObserver));
});

onMounted(() => {
  void reloadPage();
});

onUnmounted(() => {
  observer?.disconnect();
});
</script>

<style scoped>
.dynamic-page {
  display: grid;
  gap: 22px;
  width: 100%;
  max-width: 1680px;
  margin: 0 auto;
  padding-bottom: 28px;
}

.dynamic-hero {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 18px;
  padding: 20px 2px 4px;
}

.dynamic-hero h1 {
  margin: 0;
  color: var(--color-text-main);
  font-size: clamp(34px, 4vw, 44px);
  line-height: 1.05;
  letter-spacing: 0;
}

.dynamic-hero p {
  margin: 12px 0 0;
  color: var(--color-text-secondary);
  font-size: 16px;
}

.notice-bar {
  margin: 0;
  padding: 13px 16px;
  border: 1px solid #bfdbfe;
  border-radius: 14px;
  background: var(--color-primary-light);
  color: var(--color-primary);
  font-weight: 700;
}

.dynamic-layout {
  display: grid;
  grid-template-columns: minmax(820px, 1fr) 360px;
  gap: clamp(24px, 2vw, 32px);
  align-items: start;
}

.feed-column {
  display: grid;
  gap: 18px;
  min-width: 0;
}

.feed-list,
.skeleton-list {
  display: grid;
  gap: 18px;
}

.feed-skeleton {
  display: grid;
  gap: 18px;
  padding: 22px;
  border: 1px solid var(--color-border);
  border-radius: 18px;
  background: var(--color-bg-card);
  box-shadow: var(--gl-shadow-card);
}

.skeleton-head,
.skeleton-body {
  display: flex;
  gap: 14px;
}

.skeleton-head {
  align-items: center;
}

.skeleton-avatar,
.skeleton-line,
.skeleton-media,
.skeleton-copy {
  position: relative;
  overflow: hidden;
  border-radius: 12px;
  background: var(--color-bg-muted);
}

.skeleton-avatar::after,
.skeleton-line::after,
.skeleton-media::after,
.skeleton-copy::after {
  position: absolute;
  inset: 0;
  content: '';
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.68), transparent);
  animation: skeleton-shimmer 1.15s infinite;
  transform: translateX(-100%);
}

.skeleton-avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
}

.skeleton-line.short {
  width: 210px;
  height: 18px;
}

.skeleton-media {
  width: 52%;
  aspect-ratio: 16 / 9;
}

.skeleton-copy {
  flex: 1;
  min-height: 150px;
}

.error-state {
  display: grid;
  justify-items: start;
  gap: 10px;
  padding: 34px;
  border: 1px solid #fecaca;
  border-radius: 18px;
  background: #fff7f7;
}

.error-state h2 {
  margin: 0;
  color: var(--color-text-main);
}

.error-state p {
  margin: 0 0 4px;
  color: var(--color-text-secondary);
}

.load-more-sentinel {
  min-height: 34px;
  display: grid;
  place-items: center;
  color: var(--color-text-secondary);
  font-size: 13px;
}

@keyframes skeleton-shimmer {
  to {
    transform: translateX(100%);
  }
}

@media (max-width: 1120px) {
  .dynamic-layout {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 720px) {
  .dynamic-page {
    gap: 18px;
  }

  .dynamic-hero {
    align-items: stretch;
    flex-direction: column;
  }

  .dynamic-hero :deep(.el-button) {
    align-self: start;
  }

  .skeleton-body {
    flex-direction: column;
  }

  .skeleton-media {
    width: 100%;
  }
}
</style>
