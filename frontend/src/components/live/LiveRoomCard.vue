<template>
  <article class="card">
    <RouterLink :to="`/live/${item.id}`" class="cover-link">
      <img v-if="item.coverUrl" :src="item.coverUrl" :alt="item.title" class="cover" />
      <div v-else class="cover cover-fallback">
        <span>{{ sourceModeLabel }}</span>
      </div>
    </RouterLink>

    <div class="card-body">
      <div class="title-row">
        <div class="title-block">
          <h3>{{ item.title }}</h3>
          <p>{{ broadcasterLabel }}</p>
        </div>
        <span :class="['status-badge', statusClass]">{{ statusLabel }}</span>
      </div>

      <div class="meta-row">
        <span class="meta-chip">{{ sourceModeLabel }}</span>
        <span class="meta-chip">观众 {{ item.viewerCount ?? 0 }}</span>
        <span class="meta-chip">房间 #{{ item.id }}</span>
      </div>

      <div class="time-text">{{ timeLabel }}</div>

      <RouterLink :to="`/live/${item.id}`" class="primary-link">
        {{ item.status === 'LIVING' ? '进入直播间' : '查看房间' }}
      </RouterLink>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import type { LiveRoomInfo } from '@/types/api';

const props = defineProps<{
  item: LiveRoomInfo;
}>();

const broadcasterLabel = computed(() => props.item.broadcaster?.nickname ?? `用户 #${props.item.broadcaster?.id ?? '-'}`);
const sourceModeLabel = computed(() => (props.item.sourceMode === 'screen' ? '屏幕共享' : '摄像头直播'));
const statusLabel = computed(() => {
  if (props.item.status === 'LIVING') {
    return '直播中';
  }
  if (props.item.status === 'ENDED') {
    return '已结束';
  }
  return '待开播';
});
const statusClass = computed(() => {
  if (props.item.status === 'LIVING') {
    return 'status-live';
  }
  if (props.item.status === 'ENDED') {
    return 'status-ended';
  }
  return 'status-idle';
});
const timeLabel = computed(() => {
  const startedAt = props.item.startedAt ? new Date(props.item.startedAt).toLocaleString('zh-CN') : '';
  if (props.item.status === 'LIVING' && startedAt) {
    return `开播时间 ${startedAt}`;
  }

  const endedAt = props.item.endedAt ? new Date(props.item.endedAt).toLocaleString('zh-CN') : '';
  if (props.item.status === 'ENDED' && endedAt) {
    return `结束时间 ${endedAt}`;
  }

  const createdAt = props.item.createdAt ? new Date(props.item.createdAt).toLocaleString('zh-CN') : '';
  return createdAt ? `创建时间 ${createdAt}` : '等待主播开始推流';
});
</script>

<style scoped>
.card {
  overflow: hidden;
  border-radius: 20px;
  background: linear-gradient(180deg, rgba(30, 41, 59, 0.96), rgba(15, 23, 42, 0.98));
  border: 1px solid rgba(148, 163, 184, 0.18);
  box-shadow: 0 12px 32px rgba(2, 6, 23, 0.25);
}

.cover-link {
  display: block;
}

.cover {
  width: 100%;
  height: 196px;
  object-fit: cover;
  background: #020617;
}

.cover-fallback {
  display: grid;
  place-items: center;
  color: #e2e8f0;
  font-size: 16px;
  letter-spacing: 0.08em;
  background:
    radial-gradient(circle at top left, rgba(56, 189, 248, 0.28), transparent 35%),
    linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(30, 41, 59, 0.94));
}

.card-body {
  display: grid;
  gap: 14px;
  padding: 18px;
}

.title-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.title-block {
  display: grid;
  gap: 8px;
}

.title-block h3,
.title-block p {
  margin: 0;
}

.title-block p,
.time-text {
  color: #cbd5e1;
}

.meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.meta-chip,
.status-badge {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
}

.meta-chip {
  background: rgba(59, 130, 246, 0.12);
  color: #bfdbfe;
}

.status-live {
  background: rgba(239, 68, 68, 0.16);
  color: #fca5a5;
}

.status-ended {
  background: rgba(148, 163, 184, 0.16);
  color: #cbd5e1;
}

.status-idle {
  background: rgba(34, 197, 94, 0.16);
  color: #86efac;
}

.primary-link {
  color: #60a5fa;
  font-size: 14px;
}
</style>
