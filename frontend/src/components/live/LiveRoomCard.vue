<template>
  <article class="card">
    <RouterLink :to="`/live/${item.id}`" class="cover-link">
      <img v-if="item.coverUrl" :src="item.coverUrl" :alt="item.title" class="cover" />
      <div v-else class="cover cover-fallback">
        <span>{{ sourceModeLabel }}</span>
      </div>
      <div class="cover-overlay">
        <span :class="['status-badge', statusClass]">{{ statusLabel }}</span>
        <span class="viewer-pill">{{ item.viewerCount ?? 0 }} 人观看</span>
      </div>
    </RouterLink>

    <div class="card-body">
      <div class="avatar-chip">{{ broadcasterInitial }}</div>
      <div class="content-block">
        <h3>{{ item.title }}</h3>
        <p class="broadcaster">{{ broadcasterLabel }}</p>
        <div class="meta-row">
          <span>{{ sourceModeLabel }}</span>
          <span>{{ timeLabel }}</span>
        </div>
      </div>
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
const broadcasterInitial = computed(() => broadcasterLabel.value.slice(0, 1));
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
  const value = props.item.status === 'LIVING' ? props.item.startedAt : props.item.createdAt;
  return value ? new Date(value).toLocaleString('zh-CN') : '刚刚创建';
});
</script>

<style scoped>
.card {
  overflow: hidden;
  border-radius: 22px;
  background: #fff;
  border: 1px solid rgba(15, 23, 42, 0.08);
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 22px 48px rgba(15, 23, 42, 0.12);
}

.cover-link {
  position: relative;
  display: block;
}

.cover {
  width: 100%;
  height: 210px;
  object-fit: cover;
  background: #111827;
}

.cover-fallback {
  display: grid;
  place-items: center;
  color: #fff;
  background:
    radial-gradient(circle at top left, rgba(255, 255, 255, 0.18), transparent 36%),
    linear-gradient(135deg, #fb7185, #f97316 55%, #111827);
}

.cover-overlay {
  position: absolute;
  inset: auto 14px 14px 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.status-badge,
.viewer-pill {
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  color: #fff;
  backdrop-filter: blur(8px);
}

.status-live {
  background: rgba(239, 68, 68, 0.92);
}

.status-ended {
  background: rgba(75, 85, 99, 0.85);
}

.status-idle {
  background: rgba(59, 130, 246, 0.85);
}

.viewer-pill {
  background: rgba(17, 24, 39, 0.68);
}

.card-body {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 14px;
  padding: 18px;
}

.avatar-chip {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 14px;
  background: linear-gradient(135deg, #fde68a, #fb7185);
  color: #7c2d12;
  font-size: 18px;
  font-weight: 800;
}

.content-block {
  display: grid;
  gap: 8px;
}

.content-block h3,
.broadcaster,
.meta-row {
  margin: 0;
}

.content-block h3 {
  color: #111827;
  font-size: 17px;
  line-height: 1.4;
}

.broadcaster {
  color: #4b5563;
  font-size: 14px;
}

.meta-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: #6b7280;
  font-size: 12px;
}
</style>
