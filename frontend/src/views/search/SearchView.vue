<template>
  <section class="page">
    <section class="search-hero">
      <div>
        <h1>搜索结果</h1>
        <p>输入关键词后，可按视频和用户两个结果维度查看匹配内容，并按分区与排序规则筛选。</p>
      </div>
      <div class="search-box">
        <el-input v-model="keyword" placeholder="搜索视频标题、简介或用户昵称" @keyup.enter="submitSearch" />
        <el-button type="primary" @click="submitSearch">搜索</el-button>
      </div>
    </section>

    <section class="filters">
      <el-segmented v-model="category" :options="categorySegmentOptions" @change="submitSearch" />
      <el-select v-model="sortBy" class="sort-select" @change="submitSearch">
        <el-option label="综合排序" value="best" />
        <el-option label="最新优先" value="latest" />
        <el-option label="热度优先" value="hot" />
      </el-select>
    </section>

    <el-tabs v-model="activeTab" class="tabs" @tab-change="handleTabChange">
      <el-tab-pane :label="`视频 (${result.video.length})`" name="video" />
      <el-tab-pane :label="`用户 (${result.user.length})`" name="user" />
      <el-tab-pane label="直播 (0)" name="live" />
    </el-tabs>

    <section v-if="activeTab === 'video'" class="cards">
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

    <section v-else class="empty-wrap">
      <el-empty description="直播搜索结果将在直播模块完善后接入" />
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';

import VideoMediaCard from '@/components/VideoMediaCard.vue';
import { categoryOptions, normalizeCategoryCode, type CategoryCode } from '@/constants/categories';
import { searchAll } from '@/api/platform';
import type { SearchResultResponse } from '@/types/api';

const route = useRoute();
const router = useRouter();
const keyword = ref('');
const activeTab = ref<'video' | 'user' | 'live'>('video');
const sortBy = ref<'best' | 'latest' | 'hot'>('best');
const category = ref<CategoryCode>('recommend');
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

const categorySegmentOptions = computed(() =>
  categoryOptions.map((item) => ({
    label: item.label,
    value: item.code,
  })),
);

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
  try {
    const data = await searchAll({
      keyword: keyword.value.trim(),
      tab: activeTab.value,
      sortBy: sortBy.value,
      category: category.value,
    });
    Object.assign(result, data);
  } catch {
    ElMessage.error('搜索失败，请稍后重试');
  }
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

.search-hero {
  display: grid;
  gap: 16px;
  padding: 24px;
  border-radius: 24px;
  background: linear-gradient(145deg, rgba(30, 41, 59, 0.96), rgba(15, 23, 42, 0.98));
  border: 1px solid rgba(148, 163, 184, 0.18);
}

.search-box,
.filters {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.sort-select {
  width: 160px;
}

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 18px;
}

.user-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
}

.user-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px;
  border-radius: 20px;
  background: rgba(30, 41, 59, 0.92);
  border: 1px solid rgba(148, 163, 184, 0.18);
}

.user-card p {
  margin: 8px 0 0;
  color: #cbd5e1;
}

.primary-link {
  color: #60a5fa;
}

.empty-wrap {
  padding: 24px;
  border-radius: 20px;
  background: rgba(30, 41, 59, 0.92);
}
</style>
