<template>
  <section class="page">
    <section class="hero-card">
      <div class="hero-copy">
        <span class="hero-badge">综合视频社区</span>
        <h1>首页推荐</h1>
        <p>
          这里展示规则推荐流、近期热门内容和创作入口提示。管理员审核通过的新投稿会优先进入推荐队列。
        </p>
        <div class="hero-actions">
          <RouterLink to="/user/dashboard" class="hero-link primary">去投稿</RouterLink>
          <RouterLink to="/following" class="hero-link secondary">看关注流</RouterLink>
        </div>
      </div>
      <div class="hero-highlight" v-if="featured">
        <img :src="featured.coverUrl" :alt="featured.title" class="highlight-cover" />
        <div class="highlight-meta">
          <strong>{{ featured.title }}</strong>
          <span>{{ featured.creator?.nickname ?? '推荐视频' }}</span>
          <span>点赞 {{ featured.likeCount }} · 收藏 {{ featured.favoriteCount }}</span>
        </div>
      </div>
    </section>

    <div class="section-head">
      <div>
        <h2>推荐视频</h2>
        <p>基于已发布内容、互动量和发布时间排序。</p>
      </div>
      <el-button type="primary" @click="loadFeed">刷新推荐</el-button>
    </div>

    <div class="cards">
      <VideoMediaCard v-for="card in cards" :key="card.id" :item="card" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';

import VideoMediaCard from '@/components/VideoMediaCard.vue';
import { fetchRecommendFeed } from '@/api/platform';
import type { VideoCard } from '@/types/api';

const cards = ref<VideoCard[]>([]);
const featured = computed(() => cards.value[0] ?? null);

async function loadFeed() {
  try {
    cards.value = await fetchRecommendFeed();
  } catch {
    ElMessage.error('加载推荐流失败');
  }
}

onMounted(loadFeed);
</script>

<style scoped>
.page {
  display: grid;
  gap: 24px;
}

.hero-card {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 24px;
  padding: 28px;
  border-radius: 24px;
  background: radial-gradient(circle at top left, rgba(59, 130, 246, 0.18), transparent 40%),
    linear-gradient(145deg, rgba(30, 41, 59, 0.96), rgba(15, 23, 42, 0.98));
  border: 1px solid rgba(148, 163, 184, 0.18);
}

.hero-copy {
  display: grid;
  gap: 16px;
  align-content: center;
}

.hero-copy h1,
.section-head h2 {
  margin: 0;
}

.hero-copy p,
.section-head p {
  margin: 0;
  color: #cbd5e1;
  line-height: 1.6;
}

.hero-badge {
  width: fit-content;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.2);
  color: #bfdbfe;
  font-size: 13px;
}

.hero-actions {
  display: flex;
  gap: 12px;
}

.hero-link {
  padding: 10px 16px;
  border-radius: 12px;
}

.hero-link.primary {
  background: #2563eb;
  color: #fff;
}

.hero-link.secondary {
  background: rgba(148, 163, 184, 0.14);
  color: #e2e8f0;
}

.hero-highlight {
  overflow: hidden;
  border-radius: 20px;
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(148, 163, 184, 0.18);
}

.highlight-cover {
  width: 100%;
  height: 220px;
  object-fit: cover;
}

.highlight-meta {
  display: grid;
  gap: 8px;
  padding: 16px;
}

.highlight-meta span {
  color: #cbd5e1;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 18px;
}
</style>
