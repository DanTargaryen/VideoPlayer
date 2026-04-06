<template>
  <section class="page">
    <div class="hero">
      <div>
        <h1>通知中心</h1>
        <p>这里展示关注、评论和回复通知。</p>
      </div>
      <el-button type="primary" plain @click="handleReadAll">全部标记已读</el-button>
    </div>

    <div class="list">
      <article v-for="item in notifications" :key="item.id" class="card">
        <div>
          <h3>{{ item.title }}</h3>
          <p>{{ item.content }}</p>
          <span class="meta">{{ formatTime(item.createdAt) }}</span>
        </div>
        <span class="tag" :class="{ unread: !item.isRead }">{{ item.isRead ? '已读' : '未读' }}</span>
      </article>
      <el-empty v-if="notifications.length === 0" description="暂无通知" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';

import { fetchNotifications, readAllNotifications } from '@/api/platform';
import type { NotificationItem } from '@/types/api';

const notifications = ref<NotificationItem[]>([]);

function formatTime(value: string) {
  return new Date(value).toLocaleString('zh-CN');
}

async function loadNotifications() {
  try {
    notifications.value = await fetchNotifications();
  } catch {
    ElMessage.warning('请先登录后查看通知');
  }
}

async function handleReadAll() {
  try {
    await readAllNotifications();
    await loadNotifications();
    ElMessage.success('已全部标记为已读');
  } catch {
    ElMessage.error('处理失败');
  }
}

onMounted(() => {
  void loadNotifications();
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
}

.list {
  display: grid;
  gap: 12px;
}

.card {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 20px;
  border-radius: 16px;
  background: rgba(30, 41, 59, 0.9);
  border: 1px solid rgba(148, 163, 184, 0.18);
}

.meta {
  display: inline-block;
  margin-top: 8px;
  color: #94a3b8;
}

.tag {
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.2);
}

.tag.unread {
  background: rgba(239, 68, 68, 0.2);
  color: #fca5a5;
}
</style>
