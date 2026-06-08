<template>
  <section class="page">
    <section class="filters" data-tour="search-filters">
      <div class="category-rail" role="tablist" aria-label="视频分类">
        <button
          v-for="item in categoryButtonOptions"
          :key="item.code"
          type="button"
          class="category-pill"
          :class="{ active: category === item.code }"
          role="tab"
          :aria-selected="category === item.code"
          @click="selectCategory(item.code)"
        >
          {{ item.label }}
        </button>
      </div>
      <el-select v-model="sortBy" class="sort-select" @change="submitSearch">
        <el-option label="综合排序" value="best" />
        <el-option label="最新优先" value="latest" />
        <el-option label="热度优先" value="hot" />
      </el-select>
      <el-button
        v-if="activeTab === 'video'"
        type="primary"
        plain
        :loading="refreshingVideos"
        @click="refreshVideos"
      >
        <el-icon><RefreshRight /></el-icon>
        <span>刷新视频</span>
      </el-button>
    </section>

    <el-tabs v-model="activeTab" class="tabs" data-tour="search-tabs" @tab-change="handleTabChange">
      <el-tab-pane :label="`视频 (${result.video.length})`" name="video" />
      <el-tab-pane :label="`用户 (${result.user.length})`" name="user" />
      <el-tab-pane :label="`直播 (${result.live.length})`" name="live" />
    </el-tabs>

    <section v-if="activeTab === 'video'" class="cards" data-tour="search-results">
      <VideoMediaCard v-for="card in result.video" :key="card.id" :item="card" />
      <el-empty v-if="result.video.length === 0" description="当前条件下没有找到相关视频" />
    </section>

    <section v-else-if="activeTab === 'user'" class="user-grid">
      <article v-for="item in result.user" :key="item.id" class="user-card">
        <div>
          <h3>{{ item.nickname }}</h3>
          <p>用户 ID：{{ item.id }}</p>
        </div>
        <RouterLink :to="`/users/${item.id}`" class="primary-link">查看主页</RouterLink>
      </article>
      <el-empty v-if="result.user.length === 0" description="当前条件下没有找到相关用户" />
    </section>

    <section v-else class="cards">
      <LiveRoomCard v-for="item in result.live" :key="item.id" :item="item" />
      <el-empty v-if="result.live.length === 0" description="当前条件下没有找到相关直播" />
    </section>
  </section>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { RefreshRight } from '@element-plus/icons-vue';

import VideoMediaCard from '@/components/VideoMediaCard.vue';
import LiveRoomCard from '@/components/live/LiveRoomCard.vue';
import { categoryOptions, normalizeCategoryCode, type CategoryCode } from '@/constants/categories';
import { searchAll } from '@/api/platform';
import type { SearchResultResponse, VideoCard } from '@/types/api';
import { takeRandomItems } from '@/utils/randomVideos';

const route = useRoute();
const router = useRouter();
const keyword = ref('');
const activeTab = ref<'video' | 'user' | 'live'>('video');
const sortBy = ref<'best' | 'latest' | 'hot'>('best');
const category = ref<CategoryCode>('recommend');
const refreshingVideos = ref(false);
const videoCandidates = ref<VideoCard[]>([]);
const result = reactive<SearchResultResponse>({
  keyword: '',
  tab: 'video',
  sortBy: 'best',
  categoryCode: 'recommend',
  page: 1,
  pageSize: 20,
  video: [],
  live: [],
  user: [],
});

const SEARCH_VIDEO_DISPLAY_SIZE = 20;
const SEARCH_VIDEO_CANDIDATE_SIZE = 50;

const categoryOrder: CategoryCode[] = [
  'recommend',
  'entertainment',
  'tech',
  'animation',
  'game',
  'life',
  'study',
  'music',
  'film',
  'sports',
  'comedy',
  'food',
  'travel',
];

const categoryLabelOverrides: Partial<Record<CategoryCode, string>> = {
  recommend: '全部',
};

const categoryButtonOptions = categoryOrder.map((code) => {
  const option = categoryOptions.find((item) => item.code === code);
  return {
    code,
    label: categoryLabelOverrides[code] ?? option?.label ?? code,
  };
});

function normalizeTab(value: unknown): 'video' | 'user' | 'live' {
  if (value === 'user' || value === 'live') {
    return value;
  }

  return 'video';
}

function buildQuery() {
  return {
    ...(keyword.value.trim() ? { keyword: keyword.value.trim() } : {}),
    tab: activeTab.value,
    ...(category.value !== 'recommend' ? { category: category.value } : {}),
    ...(sortBy.value !== 'best' ? { sortBy: sortBy.value } : {}),
  };
}

async function loadSearch() {
  refreshingVideos.value = activeTab.value === 'video';
  try {
    const data = await searchAll({
      keyword: keyword.value.trim(),
      tab: activeTab.value,
      sortBy: sortBy.value,
      category: category.value,
      pageSize: activeTab.value === 'video' ? SEARCH_VIDEO_CANDIDATE_SIZE : SEARCH_VIDEO_DISPLAY_SIZE,
    });
    if (activeTab.value === 'video') {
      videoCandidates.value = data.video;
      Object.assign(result, {
        ...data,
        video: takeRandomItems(data.video, SEARCH_VIDEO_DISPLAY_SIZE),
        pageSize: SEARCH_VIDEO_DISPLAY_SIZE,
      });
    } else {
      videoCandidates.value = [];
      Object.assign(result, data);
    }
  } catch {
    ElMessage.error('搜索失败，请稍后重试');
  } finally {
    refreshingVideos.value = false;
  }
}

async function refreshVideos() {
  if (refreshingVideos.value) {
    return;
  }

  if (videoCandidates.value.length === 0) {
    await loadSearch();
    return;
  }

  result.video = takeRandomItems(videoCandidates.value, SEARCH_VIDEO_DISPLAY_SIZE);
}

function selectCategory(nextCategory: CategoryCode) {
  if (category.value === nextCategory) {
    return;
  }

  category.value = nextCategory;
  submitSearch();
}

function submitSearch() {
  router.replace({
    path: '/search',
    query: buildQuery(),
  });
}

function handleTabChange(value: string | number) {
  activeTab.value = normalizeTab(value);
  submitSearch();
}

watch(
  () => route.query,
  (query) => {
    keyword.value = String(query.keyword ?? '');
    activeTab.value = normalizeTab(query.tab);
    category.value = normalizeCategoryCode(typeof query.category === 'string' ? query.category : undefined);
    sortBy.value = query.sortBy === 'hot' ? 'hot' : query.sortBy === 'latest' ? 'latest' : 'best';
    void loadSearch();
  },
  { immediate: true },
);
</script>

<style scoped>
.page {
  display: grid;
  gap: 24px;
}

.filters {
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
}

.category-rail {
  display: flex;
  align-items: center;
  flex: 1 1 720px;
  min-width: 0;
  gap: 14px;
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
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.035);
  cursor: pointer;
  font-size: 14px;
  font-weight: 760;
  white-space: nowrap;
  transition:
    transform 0.26s cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 0.26s cubic-bezier(0.16, 1, 0.3, 1),
    background 0.22s ease,
    border-color 0.22s ease,
    color 0.22s ease;
}

.category-pill:hover {
  color: var(--color-primary);
  border-color: #cfe0ff;
}

.category-pill.active {
  color: #ffffff;
  background: var(--color-primary);
  border-color: var(--color-primary);
  box-shadow: 0 12px 24px rgba(47, 111, 237, 0.2);
}

.category-pill:active {
  transform: translateY(-1px) scale(0.98);
}

.sort-select {
  width: 160px;
}

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, 300px);
  gap: 18px;
  justify-content: center;
}

.user-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, 260px);
  gap: 16px;
}

.user-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px;
  border-radius: 20px;
  background: #ffffff;
  border: 1px solid rgba(15, 23, 42, 0.08);
  box-shadow: 0 4px 24px rgba(15, 23, 42, 0.06);
}

.user-card h3 {
  margin: 0;
  color: #111827;
}

.user-card p {
  margin: 8px 0 0;
  color: #6b7280;
}

.primary-link {
  color: #2563eb;
}

@media (max-width: 720px) {
  .filters {
    gap: 12px;
  }

  .category-rail {
    flex-basis: 100%;
    gap: 10px;
  }

  .category-pill {
    height: 36px;
    padding: 0 17px;
  }

  .sort-select {
    width: min(100%, 180px);
  }
}

</style>
