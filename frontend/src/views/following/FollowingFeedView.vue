<template>
  <section class="page">
    <div class="hero">
      <div>
        <h1>动态</h1>
        <p>查看你已关注用户最近发布的内容。</p>
      </div>
      <el-button type="primary" @click="loadFeed">刷新动态</el-button>
    </div>

    <div class="cards">
      <article v-for="card in cards" :key="card.id" class="card">
        <img :src="card.coverUrl" :alt="card.title" class="cover" />
        <div class="card-body">
          <h3>{{ card.title }}</h3>
          <p>{{ card.description }}</p>
          <span class="meta">发布者：{{ card.creator?.nickname ?? card.creatorId }}</span>
          <RouterLink :to="`/video/${card.id}`" class="enter-link">查看详情</RouterLink>
        </div>
      </article>
      <el-empty v-if="cards.length === 0" description="你还没有关注任何用户，或关注用户尚未发布内容" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';

import { fetchFollowingFeed } from '@/api/platform';
import type { VideoCard } from '@/types/api';

const cards = ref<VideoCard[]>([]);

async function loadFeed() {
  try {
    cards.value = await fetchFollowingFeed();
  } catch {
    ElMessage.warning('请先登录后查看关注流');
  }
}

onMounted(() => {
  void loadFeed();
});
</script>

<style scoped>
.page {
  display: grid;
  gap: 20px;
}

.hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.hero h1 {
  margin: 0;
  color: #111827;
}

.hero p {
  margin: 4px 0 0;
  color: #4b5563;
}

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, 280px);
  gap: 16px;
  justify-content: center;
}

.card {
  overflow: hidden;
  border-radius: 16px;
  background: #ffffff;
  border: 1px solid rgba(15, 23, 42, 0.08);
  box-shadow: 0 4px 24px rgba(15, 23, 42, 0.06);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.1);
}

.cover {
  width: 100%;
  height: 180px;
  object-fit: cover;
}

.card-body {
  display: grid;
  gap: 12px;
  padding: 18px;
}

.card-body h3 {
  margin: 0;
  color: #111827;
}

.card-body p {
  margin: 0;
  color: #4b5563;
}

.meta {
  color: #6b7280;
}

.enter-link {
  color: #2563eb;
}
</style>
