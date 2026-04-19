<template>
  <section class="page">
    <div class="hero">
      <div>
        <h1>消息</h1>
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
import { useAppStore } from '@/stores/app';
import type { NotificationItem } from '@/types/api';

const store = useAppStore();
const notifications = ref<NotificationItem[]>([]);

function formatTime(value: string) {
  return new Date(value).toLocaleString('zh-CN');
}

async function loadNotifications() {
  try {
    notifications.value = await fetchNotifications();
    store.setUnreadNotificationCount(notifications.value.filter((item) => !item.isRead).length);
  } catch {
    ElMessage.warning('请先登录后查看通知');
  }
}

async function handleReadAll() {
  try {
    await readAllNotifications();
    store.setUnreadNotificationCount(0);
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

.hero h1 {
  margin: 0;
  color: #111827;
}

.hero p {
  margin: 4px 0 0;
  color: #4b5563;
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
  background: #ffffff;
  border: 1px solid rgba(15, 23, 42, 0.08);
  box-shadow: 0 4px 24px rgba(15, 23, 42, 0.06);
}

.card h3 {
  margin: 0;
  color: #111827;
}

.card p {
  margin: 4px 0 0;
  color: #4b5563;
}

.meta {
  display: inline-block;
  margin-top: 8px;
  color: #6b7280;
}

.tag {
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.06);
  color: #6b7280;
  font-size: 13px;
}

.tag.unread {
  background: rgba(37, 99, 235, 0.1);
  color: #2563eb;
}
</style>
