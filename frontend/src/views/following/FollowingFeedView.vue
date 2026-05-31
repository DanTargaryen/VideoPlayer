<template>
  <section class="page">
    <div class="hero">
      <div>
        <h1>动态</h1>
        <p>查看你已关注用户最近发布的内容。</p>
      </div>
      <el-button type="primary" :loading="refreshingFeed" @click="loadFeed">
        <el-icon><RefreshRight /></el-icon>
        <span>刷新动态</span>
      </el-button>
    </div>

    <div class="cards">
      <VideoMediaCard v-for="card in cards" :key="card.id" :item="card" />
      <el-empty v-if="cards.length === 0" description="你还没有关注任何用户，或关注用户尚未发布内容" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { RefreshRight } from '@element-plus/icons-vue';

import { fetchFollowingFeed } from '@/api/platform';
import VideoMediaCard from '@/components/VideoMediaCard.vue';
import type { VideoCard } from '@/types/api';
import { takeRandomItems } from '@/utils/randomVideos';

const cards = ref<VideoCard[]>([]);
const refreshingFeed = ref(false);
const FOLLOWING_FEED_SIZE = 12;

async function loadFeed() {
  if (refreshingFeed.value) {
    return;
  }

  refreshingFeed.value = true;
  try {
    const videos = await fetchFollowingFeed();
    cards.value = takeRandomItems(videos, FOLLOWING_FEED_SIZE);
  } catch {
    ElMessage.warning('请先登录后查看关注流');
  } finally {
    refreshingFeed.value = false;
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
</style>
