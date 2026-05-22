<template>
  <div class="back-btn" @click="goBack">
    <el-icon :size="20"><ArrowLeft /></el-icon>
  </div>
  <section class="page" v-loading="loading">
    <div class="hero" v-if="homepage">
      <div class="profile-head">
        <img :src="homepage.avatarUrl || fallbackAvatar" :alt="homepage.nickname" class="avatar" />
        <div>
          <h1>{{ homepage.nickname }} 的主页</h1>
          <p>{{ homepage.bio || '这个用户还没有填写简介。' }}</p>
          <span class="meta">粉丝 {{ homepage.followers }} · 关注 {{ homepage.following }} · 视频 {{ homepage.videos }}</span>
          <span v-if="isOwnHomepage" class="meta coin-meta">平台货币 {{ homepage.coinBalance ?? 0 }}</span>
        </div>
      </div>
      <div class="hero-actions">
        <el-button
          v-if="canOpenDirectMessage"
          type="primary"
          plain
          @click="openDirectMessage"
        >
          发私信
        </el-button>
        <el-button
          v-if="canFollow"
          :type="homepage.isFollowing ? 'default' : 'primary'"
          @click="toggleFollow"
        >
          {{ homepage.isFollowing ? '取消关注' : '关注用户' }}
        </el-button>
        <el-button
          v-if="homepage.items.length > 0"
          type="primary"
          plain
          :loading="refreshingVideos"
          @click="refreshHomepageVideos"
        >
          <el-icon><RefreshRight /></el-icon>
          <span>刷新视频</span>
        </el-button>
      </div>
    </div>

    <div class="cards" v-if="homepage">
      <article v-for="card in displayedItems" :key="card.id" class="card">
        <img :src="card.coverUrl" :alt="card.title" class="cover" />
        <div class="card-body">
          <h3>{{ card.title }}</h3>
          <p>{{ card.description }}</p>
          <RouterLink :to="`/video/${card.id}`" class="enter-link">查看详情</RouterLink>
        </div>
      </article>
      <el-empty v-if="homepage.items.length === 0" description="该用户还没有发布内容" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { ArrowLeft, RefreshRight } from '@element-plus/icons-vue';

import { fetchUserHomepage, followUser, unfollowUser } from '@/api/platform';
import { useAppStore } from '@/stores/app';
import type { UserHomepage, VideoCard } from '@/types/api';
import { takeRandomItems } from '@/utils/randomVideos';

const router = useRouter();

function goBack() {
  router.back();
}

const fallbackAvatar = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=320&q=80';
const route = useRoute();
const store = useAppStore();
const loading = ref(false);
const homepage = ref<UserHomepage | null>(null);
const displayedItems = ref<VideoCard[]>([]);
const refreshingVideos = ref(false);
const HOMEPAGE_DISPLAY_SIZE = 12;
const HOMEPAGE_CANDIDATE_SIZE = 60;

const canFollow = computed(
  () => homepage.value && store.isLoggedIn && homepage.value.id !== store.userId,
);
const isOwnHomepage = computed(() => Boolean(homepage.value && store.userId === homepage.value.id));
const canOpenDirectMessage = computed(() => Boolean(homepage.value && store.isLoggedIn && homepage.value.id !== store.userId));

async function loadHomepage() {
  loading.value = true;
  try {
    homepage.value = await fetchUserHomepage(Number(route.params.id), {
      itemLimit: HOMEPAGE_CANDIDATE_SIZE,
    });
    refreshHomepageVideos();
  } catch {
    ElMessage.error('加载用户主页失败');
  } finally {
    loading.value = false;
  }
}

function refreshHomepageVideos() {
  if (!homepage.value || refreshingVideos.value) {
    return;
  }

  refreshingVideos.value = true;
  displayedItems.value = takeRandomItems(homepage.value.items, HOMEPAGE_DISPLAY_SIZE);
  refreshingVideos.value = false;
}

async function toggleFollow() {
  if (!homepage.value) {
    return;
  }

  try {
    if (homepage.value.isFollowing) {
      await unfollowUser(homepage.value.id);
      ElMessage.success('已取消关注');
    } else {
      await followUser(homepage.value.id);
      ElMessage.success('关注成功');
    }
    await loadHomepage();
  } catch {
    ElMessage.error('操作失败，请确认已登录');
  }
}

function openDirectMessage() {
  if (!homepage.value) {
    return;
  }

  void router.push({
    path: '/messages',
    query: { userId: String(homepage.value.id) },
  });
}

watch(
  () => route.params.id,
  () => {
    void loadHomepage();
  },
  { immediate: true },
);
</script>

<style scoped>
.back-btn {
  position: fixed;
  top: 100px;
  left: 32px;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  color: #374151;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.back-btn:hover {
  background: #ffffff;
  color: #2563eb;
  transform: scale(1.1);
}

.page {
  display: grid;
  gap: 20px;
}

.hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 24px;
  border-radius: 16px;
  background: #ffffff;
  border: 1px solid rgba(15, 23, 42, 0.08);
  box-shadow: 0 4px 24px rgba(15, 23, 42, 0.06);
}

.profile-head {
  display: flex;
  align-items: center;
  gap: 18px;
}

.profile-head h1 {
  margin: 0;
  color: #111827;
}

.profile-head p {
  margin: 4px 0 0;
  color: #4b5563;
}

.avatar {
  width: 88px;
  height: 88px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid rgba(37, 99, 235, 0.15);
}

.meta {
  display: inline-block;
  margin-top: 8px;
  color: #6b7280;
}

.coin-meta {
  display: block;
  color: #f59e0b;
  font-weight: 700;
}

.hero-actions {
  display: flex;
  align-items: center;
  gap: 12px;
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

.enter-link {
  color: #2563eb;
}
</style>
