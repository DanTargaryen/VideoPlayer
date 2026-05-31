<template>
  <section class="dynamic-page">
    <div class="dynamic-layout">
      <LeftDynamicSidebar
        :nickname="currentNickname"
        :avatar-url="store.avatarUrl"
        :profile-stats="sidebarProfileStats"
        :groups="followGroups"
        :active-group-id="activeGroupId"
        :live-items="sidebarLive"
        @update:active-group-id="handleGroupChange"
      />

      <main class="feed-column">
        <section v-if="store.isLoggedIn" ref="composerCardRef" class="post-composer">
          <div class="composer-main">
            <img v-if="store.avatarUrl" :src="store.avatarUrl" :alt="store.nickname" class="composer-avatar" />
            <span v-else class="composer-avatar fallback">{{ store.nickname.slice(0, 1) }}</span>
            <el-input
              v-model="postForm.content"
              type="textarea"
              :rows="composerExpanded ? 3 : 1"
              maxlength="1000"
              resize="none"
              placeholder="分享你的近况、观点或想法..."
              @focus="composerExpanded = true"
            />
          </div>
          <div v-if="postForm.images.length > 0" class="composer-images">
            <div v-for="(image, index) in postForm.images" :key="`${image}-${index}`" class="composer-image">
              <img :src="image" :alt="`动态图片 ${index + 1}`" />
              <button type="button" class="composer-image-remove" @click="removePostImage(index)">移除</button>
            </div>
          </div>
          <div class="composer-actions">
            <input ref="postImageInputRef" type="file" accept="image/*" hidden @change="handlePostImageChange" />
            <div class="composer-tool-row">
              <el-button plain :loading="uploadingPostImage" @click="postImageInputRef?.click()">图片</el-button>
              <el-button plain @click="showComingSoon('视频动态')">视频</el-button>
              <el-button plain @click="showComingSoon('话题选择')">话题</el-button>
              <el-button plain @click="showComingSoon('投票')">投票</el-button>
            </div>
            <div class="publish-row">
              <el-button type="primary" :loading="publishingPost" @click="submitDynamicPost">发布</el-button>
              <button type="button" class="publish-more" aria-label="更多发布设置">v</button>
            </div>
          </div>
        </section>

        <RecentFollowingBar
          :users="recentFollowingUsers"
          :active-author-id="activeAuthorId"
          @select="handleAuthorSelect"
        />

        <section class="feed-control-panel">
          <div class="feed-filter-row">
            <FeedTabs v-model="activeType" />
            <el-select v-model="sortMode" class="sort-select" size="small" aria-label="动态排序">
              <el-option label="最新" value="latest" />
              <el-option label="最热" value="hot" />
            </el-select>
          </div>
          <button v-if="newDynamicCount > 0" type="button" class="new-dynamic-notice" @click="handleNewDynamicClick">
            有 {{ newDynamicCount }} 条新动态，点击查看
            <span>›</span>
          </button>
        </section>

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

        <EmptyFeedState v-else-if="displayedFeedItems.length === 0" />

        <div v-else class="feed-list">
          <DynamicFeedCard
            v-for="(item, index) in displayedFeedItems"
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
        :hot-topics="hotTopics"
        :recent-updates="recentUpdates"
        :recommended-users="recommendedUsers"
        :loading-user-id="followingUserId"
        @follow="handleRecommendedFollow"
        @refresh-recommended="loadRecommendedUsers"
      />
    </div>
    <FloatingDynamicActions @compose="focusComposer" />
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';

import {
  createDynamicPost,
  followUser,
  getDynamicFeed,
  getRecentUpdates,
  getRecommendedUsers,
  getSidebarLive,
  uploadDynamicPostImage,
} from '@/api/feed';
import { fetchFollowing, fetchRecommendFeed } from '@/api/platform';
import DynamicFeedCard from '@/components/dynamic/DynamicFeedCard.vue';
import DynamicSidebar from '@/components/dynamic/DynamicSidebar.vue';
import EmptyFeedState from '@/components/dynamic/EmptyFeedState.vue';
import FeedTabs from '@/components/dynamic/FeedTabs.vue';
import FloatingDynamicActions from '@/components/dynamic/FloatingDynamicActions.vue';
import LeftDynamicSidebar from '@/components/dynamic/LeftDynamicSidebar.vue';
import RecentFollowingBar from '@/components/dynamic/RecentFollowingBar.vue';
import { useAppStore } from '@/stores/app';
import type {
  DynamicFeedItem,
  DynamicFeedType,
  FollowGroupItem,
  FollowUserItem,
  HotTopicItem,
  SidebarProfileStats,
  SidebarLiveItem,
  SidebarRecentUpdateItem,
  SidebarRecommendedUser,
} from '@/types/api';

const store = useAppStore();
const router = useRouter();

const activeType = ref<DynamicFeedType>('all');
const activeGroupId = ref('all');
const activeAuthorId = ref('');
const sortMode = ref<'latest' | 'hot'>('latest');
const feedItems = ref<DynamicFeedItem[]>([]);
const sidebarLive = ref<SidebarLiveItem[]>([]);
const recentUpdates = ref<SidebarRecentUpdateItem[]>([]);
const followingUsers = ref<FollowUserItem[]>([]);
const recommendedUsers = ref<SidebarRecommendedUser[]>([]);
const page = ref(1);
const pageSize = 10;
const hasMore = ref(false);
const loading = ref(false);
const loadingMore = ref(false);
const errorMessage = ref('');
const followingUserId = ref<string>();
const loadMoreSentinel = ref<HTMLElement>();
const composerCardRef = ref<HTMLElement>();
const postImageInputRef = ref<HTMLInputElement | null>(null);
const uploadingPostImage = ref(false);
const publishingPost = ref(false);
const composerExpanded = ref(false);
const newDynamicCount = ref(0);
const postForm = reactive({
  content: '',
  images: [] as string[],
});
let observer: IntersectionObserver | null = null;

const sidebarProfileStats = ref<SidebarProfileStats>({
  followingCount: 485,
  followerCount: 12000,
  dynamicCount: 326,
});
const followGroups = ref<FollowGroupItem[]>(defaultFollowGroups());
const hotTopics = ref<HotTopicItem[]>([
  { id: 'ai-agent', name: 'AI Agent', discussionCount: 126000, isRising: true },
  { id: 'java-backend', name: 'Java后端', discussionCount: 83000, isRising: true },
  { id: 'math-model', name: '数学建模', discussionCount: 62000 },
  { id: 'game-live', name: '游戏实况', discussionCount: 51000, isRising: true },
]);

const currentNickname = computed(() => store.nickname || '演示用户');
const recentFollowingUsers = computed(() => followingUsers.value.slice(0, 12));
const displayedFeedItems = computed(() => {
  const filtered = feedItems.value.filter((item) => {
    if (activeType.value === 'recommend' && item.source !== 'recommended') {
      return false;
    }

    if (activeAuthorId.value && item.author.id !== activeAuthorId.value) {
      return false;
    }

    if (!matchesActiveGroup(item)) {
      return false;
    }

    return true;
  });

  return [...filtered].sort((a, b) => {
    if (sortMode.value === 'hot') {
      return getHotScore(b) - getHotScore(a);
    }

    return Date.parse(b.createdAt) - Date.parse(a.createdAt);
  });
});

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
      type: activeType.value === 'recommend' ? 'all' : activeType.value,
      page: page.value,
      pageSize,
    });
    feedItems.value = reset ? result.list : mergeItems(feedItems.value, result.list);
    hasMore.value = result.hasMore;
    page.value += 1;
  } catch (error) {
    try {
      const fallbackItems = await loadRecommendFallback(page.value);
      feedItems.value = reset ? fallbackItems : mergeItems(feedItems.value, fallbackItems);
      hasMore.value = fallbackItems.length >= pageSize;
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
  if (['live', 'post', 'image_text', 'text', 'image'].includes(activeType.value)) {
    return [];
  }

  const videos = await fetchRecommendFeed({
    page: targetPage,
    pageSize,
  });

  return videos.map<DynamicFeedItem>((video) => {
    const createdAt = video.publishedAt ?? video.createdAt ?? new Date().toISOString();
    return {
      id: `video-${video.id}`,
      type: 'video',
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
      duration: video.durationSeconds ?? undefined,
      category: formatCategory(video.category),
      createdAt,
      stats: {
        views: video.playCount ?? 0,
        likes: video.likeCount ?? 0,
        comments: video.commentCount ?? 0,
        favorites: video.favoriteCount ?? 0,
        liked: false,
      },
    };
  });
}

function matchesActiveGroup(item: DynamicFeedItem) {
  if (activeGroupId.value === 'all') {
    return true;
  }

  const category = `${item.category ?? ''} ${item.title ?? ''} ${item.description ?? ''}`.toLowerCase();
  const groupKeywords: Record<string, string[]> = {
    study: ['学习', '知识', '英语', '考试', 'study'],
    programming: ['编程', '科技', '技术', 'typescript', 'java', 'next', 'coding', 'tech'],
    game: ['游戏', '实况', 'game'],
    film: ['影视', '电影', '娱乐', 'media', 'film'],
  };

  return (groupKeywords[activeGroupId.value] ?? []).some((keyword) => category.includes(keyword));
}

function getHotScore(item: DynamicFeedItem) {
  return Number(item.stats?.views ?? 0) + Number(item.stats?.likes ?? 0) * 8 + Number(item.stats?.comments ?? 0) * 12;
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
    followingUsers.value = await fetchFollowing(store.userId);
  } catch {
    followingUsers.value = [];
  }
}

function defaultFollowGroups(): FollowGroupItem[] {
  return [
    { id: 'all', name: '全部关注', count: 485, icon: 'A' },
    { id: 'study', name: '学习区', count: 128, icon: 'S' },
    { id: 'programming', name: '编程区', count: 96, icon: 'C' },
    { id: 'game', name: '游戏区', count: 77, icon: 'G' },
    { id: 'film', name: '影视区', count: 62, icon: 'F' },
  ];
}

async function reloadPage() {
  await Promise.all([loadFeed(true), loadSidebar()]);
  await nextTick();
  setupObserver();
}

function handleGroupChange(groupId: string) {
  activeGroupId.value = groupId;
  activeAuthorId.value = '';
}

function handleAuthorSelect(authorId: string) {
  activeAuthorId.value = authorId;
}

async function handleNewDynamicClick() {
  newDynamicCount.value = 0;
  await reloadPage();
}

function showComingSoon(label: string) {
  ElMessage.info(`${label}能力正在建设中`);
}

function focusComposer() {
  composerExpanded.value = true;
  composerCardRef.value?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  window.setTimeout(() => {
    const textarea = composerCardRef.value?.querySelector('textarea');
    textarea?.focus();
  }, 180);
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

async function handlePostImageChange(event: Event) {
  const target = event.target as HTMLInputElement | null;
  const file = target?.files?.[0];
  if (!file) {
    return;
  }

  uploadingPostImage.value = true;
  try {
    const uploaded = await uploadDynamicPostImage(file);
    postForm.images.push(uploaded.url);
  } catch {
    ElMessage.error('图片上传失败，请稍后重试');
  } finally {
    uploadingPostImage.value = false;
    if (target) {
      target.value = '';
    }
  }
}

function removePostImage(index: number) {
  postForm.images.splice(index, 1);
}

async function submitDynamicPost() {
  const content = postForm.content.trim();
  if (!content && postForm.images.length === 0) {
    ElMessage.warning('请输入动态内容或上传图片');
    return;
  }

  publishingPost.value = true;
  try {
    await createDynamicPost({
      content,
      images: postForm.images,
    });
    postForm.content = '';
    postForm.images = [];
    composerExpanded.value = false;
    ElMessage.success('动态已发布');
    activeType.value = 'post';
    await Promise.all([loadFeed(true), loadRecentUpdates()]);
    await nextTick();
    setupObserver();
  } catch {
    ElMessage.error('动态发布失败，请稍后重试');
  } finally {
    publishingPost.value = false;
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
  width: 100%;
  max-width: 1440px;
  margin: 0 auto;
  padding-bottom: 30px;
}

.dynamic-layout {
  display: grid;
  grid-template-columns: 270px minmax(0, 720px) 310px;
  justify-content: center;
  gap: clamp(18px, 1.5vw, 24px);
  align-items: start;
}

.feed-column {
  display: grid;
  gap: 12px;
  min-width: 0;
}

.post-composer,
.feed-control-panel {
  border: 1px solid var(--color-border);
  border-radius: 16px;
  background: var(--color-bg-card);
  box-shadow: var(--gl-shadow-card);
}

.post-composer {
  display: grid;
  gap: 12px;
  padding: 12px 14px;
}

.composer-main {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr);
  gap: 12px;
  align-items: start;
}

.composer-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.composer-avatar.fallback {
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #dbeafe, #f1f5f9);
  color: var(--color-primary);
  font-weight: 900;
}

.post-composer :deep(.el-textarea__inner) {
  min-height: 46px !important;
  border-radius: 14px;
  padding: 12px 14px;
  background: #fbfdff;
  font-size: 14px;
  line-height: 1.45;
  box-shadow: none;
  transition: min-height var(--gl-transition), border-color var(--gl-transition), box-shadow var(--gl-transition);
}

.post-composer :deep(.el-textarea__inner:focus) {
  border-color: #bfdbfe;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.08);
}

.composer-images {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  padding-left: 56px;
}

.composer-image {
  position: relative;
  overflow: hidden;
  border-radius: 12px;
  aspect-ratio: 4 / 3;
  background: var(--color-bg-muted);
}

.composer-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.composer-image-remove {
  position: absolute;
  right: 8px;
  bottom: 8px;
  padding: 6px 10px;
  border: 0;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.72);
  color: #fff;
  cursor: pointer;
  font-size: 12px;
}

.composer-actions {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  padding-left: 56px;
}

.composer-tool-row,
.publish-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.composer-tool-row :deep(.el-button) {
  min-width: 72px;
  border-radius: 999px;
  font-weight: 700;
}

.publish-row :deep(.el-button) {
  min-width: 82px;
  border-radius: 999px;
}

.publish-more {
  display: grid;
  place-items: center;
  width: 36px;
  height: 32px;
  border: 1px solid #bfdbfe;
  border-radius: 999px;
  background: #ffffff;
  color: var(--color-primary);
  cursor: pointer;
  font-weight: 900;
  transition: background var(--gl-transition), transform var(--gl-transition);
}

.publish-more:hover {
  background: var(--color-primary-light);
}

.publish-more:active {
  transform: translateY(1px) scale(0.98);
}

.feed-control-panel {
  display: grid;
  gap: 9px;
  padding: 10px 14px 8px;
}

.feed-filter-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.feed-filter-row :deep(.feed-tabs) {
  min-width: 0;
  flex: 1;
}

.sort-select {
  flex: 0 0 92px;
}

.sort-select :deep(.el-select__wrapper) {
  border-radius: 999px;
  box-shadow: 0 0 0 1px var(--color-border) inset;
}

.new-dynamic-notice {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  min-height: 28px;
  border: 0;
  border-radius: 8px;
  background: linear-gradient(90deg, #eff6ff, #eaf2ff);
  color: var(--color-primary);
  cursor: pointer;
  font-size: 13px;
  font-weight: 800;
  transition: background var(--gl-transition), transform var(--gl-transition);
}

.new-dynamic-notice:hover {
  background: #dbeafe;
}

.new-dynamic-notice:active {
  transform: translateY(1px) scale(0.995);
}

.feed-list,
.skeleton-list {
  display: grid;
  gap: 10px;
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

@media (max-width: 1200px) {
  .dynamic-layout {
    grid-template-columns: minmax(0, 720px) 310px;
  }
}

@media (max-width: 900px) {
  .dynamic-layout {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 720px) {
  .dynamic-page {
    gap: 18px;
  }

  .composer-main {
    grid-template-columns: 38px minmax(0, 1fr);
    gap: 10px;
  }

  .composer-avatar {
    width: 38px;
    height: 38px;
  }

  .composer-images {
    grid-template-columns: 1fr;
    padding-left: 0;
  }

  .composer-actions {
    padding-left: 0;
  }

  .feed-filter-row {
    align-items: flex-start;
    flex-direction: column;
  }

  .skeleton-body {
    flex-direction: column;
  }

  .skeleton-media {
    width: 100%;
  }
}
</style>
