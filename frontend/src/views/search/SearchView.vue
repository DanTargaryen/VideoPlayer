<template>
  <section class="page">
    <section class="search-hero">
      <div>
        <h1>搜索结果</h1>
        <p>输入关键词后，可按视频和用户两个结果维度查看匹配内容。</p>
      </div>
      <div class="search-box">
        <el-input v-model="keyword" placeholder="搜索视频标题或用户昵称" @keyup.enter="submitSearch" />
        <el-button type="primary" @click="submitSearch">搜索</el-button>
      </div>
    </section>

    <el-tabs v-model="activeTab" class="tabs">
      <el-tab-pane :label="`视频 (${result.video.length})`" name="video" />
      <el-tab-pane :label="`用户 (${result.user.length})`" name="user" />
      <el-tab-pane label="直播 (0)" name="live" />
    </el-tabs>

    <section v-if="activeTab === 'video'" class="cards">
      <VideoMediaCard v-for="card in result.video" :key="card.id" :item="card" />
      <el-empty v-if="result.video.length === 0" description="没有找到相关视频" />
    </section>

    <section v-else-if="activeTab === 'user'" class="user-grid">
      <article v-for="item in result.user" :key="item.id" class="user-card">
        <div>
          <h3>{{ item.nickname }}</h3>
          <p>用户 ID：{{ item.id }}</p>
        </div>
        <RouterLink :to="`/users/${item.id}`" class="primary-link">查看主页</RouterLink>
      </article>
      <el-empty v-if="result.user.length === 0" description="没有找到相关用户" />
    </section>

    <section v-else class="empty-wrap">
      <el-empty description="直播搜索结果将在直播模块完善后接入" />
    </section>
  </section>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';

import VideoMediaCard from '@/components/VideoMediaCard.vue';
import { searchAll } from '@/api/platform';
import type { VideoCard } from '@/types/api';

interface SearchResultState {
  video: VideoCard[];
  user: Array<{ id: number; nickname: string }>;
}

const route = useRoute();
const router = useRouter();
const keyword = ref(String(route.query.keyword ?? ''));
const activeTab = ref((String(route.query.tab ?? 'video') as 'video' | 'user' | 'live') || 'video');
const result = reactive<SearchResultState>({
  video: [],
  user: [],
});

async function loadSearch() {
  try {
    const data = await searchAll(keyword.value);
    result.video = data.video;
    result.user = data.user;
  } catch {
    ElMessage.error('搜索失败，请稍后重试');
  }
}

function submitSearch() {
  router.replace({
    path: '/search',
    query: {
      keyword: keyword.value,
      tab: activeTab.value,
    },
  });
  void loadSearch();
}

watch(activeTab, (value) => {
  router.replace({
    path: '/search',
    query: {
      keyword: keyword.value,
      tab: value,
    },
  });
});

onMounted(() => {
  void loadSearch();
});
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

.search-box {
  display: flex;
  gap: 12px;
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
