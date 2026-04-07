<template>
  <section class="page" v-loading="loading">
    <div class="hero" v-if="homepage">
      <div class="profile-head">
        <img :src="homepage.avatarUrl || fallbackAvatar" :alt="homepage.nickname" class="avatar" />
        <div>
          <h1>{{ homepage.nickname }} 的主页</h1>
          <p>{{ homepage.bio || '这个用户还没有填写简介。' }}</p>
          <span class="meta">粉丝 {{ homepage.followers }} · 关注 {{ homepage.following }} · 视频 {{ homepage.videos }}</span>
        </div>
      </div>
      <el-button
        v-if="canFollow"
        :type="homepage.isFollowing ? 'default' : 'primary'"
        @click="toggleFollow"
      >
        {{ homepage.isFollowing ? '取消关注' : '关注用户' }}
      </el-button>
    </div>

    <div class="cards" v-if="homepage">
      <article v-for="card in homepage.items" :key="card.id" class="card">
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
import { useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';

import { fetchUserHomepage, followUser, unfollowUser } from '@/api/platform';
import { useAppStore } from '@/stores/app';
import type { UserHomepage } from '@/types/api';

const fallbackAvatar = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=320&q=80';
const route = useRoute();
const store = useAppStore();
const loading = ref(false);
const homepage = ref<UserHomepage | null>(null);

const canFollow = computed(
  () => homepage.value && store.isLoggedIn && homepage.value.id !== store.userId,
);

async function loadHomepage() {
  loading.value = true;
  try {
    homepage.value = await fetchUserHomepage(Number(route.params.id));
  } catch {
    ElMessage.error('加载用户主页失败');
  } finally {
    loading.value = false;
  }
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

watch(
  () => route.params.id,
  () => {
    void loadHomepage();
  },
  { immediate: true },
);
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
  padding: 20px;
  border-radius: 16px;
  background: rgba(30, 41, 59, 0.9);
  border: 1px solid rgba(148, 163, 184, 0.18);
}

.profile-head {
  display: flex;
  align-items: center;
  gap: 18px;
}

.avatar {
  width: 88px;
  height: 88px;
  border-radius: 50%;
  object-fit: cover;
}

.meta {
  display: inline-block;
  margin-top: 8px;
  color: #94a3b8;
}

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}

.card {
  overflow: hidden;
  border-radius: 16px;
  background: rgba(30, 41, 59, 0.9);
  border: 1px solid rgba(148, 163, 184, 0.18);
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

.enter-link {
  color: #60a5fa;
}
</style>
