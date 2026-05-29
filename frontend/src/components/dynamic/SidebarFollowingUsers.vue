<template>
  <section class="sidebar-card">
    <header class="sidebar-head">
      <h2>我关注的 UP 主</h2>
      <span>{{ items.length }} 位</span>
    </header>
    <div v-if="items.length > 0" class="user-list" :class="{ expanded }">
      <RouterLink v-for="item in visibleItems" :key="item.id" :to="`/users/${item.id}`" class="user-item">
        <img v-if="item.avatarUrl" :src="item.avatarUrl" :alt="item.nickname" />
        <span v-else class="avatar-fallback">{{ item.nickname.slice(0, 1) }}</span>
        <strong>{{ item.nickname }}</strong>
        <span class="followed">已关注</span>
      </RouterLink>
    </div>
    <p v-else class="sidebar-empty">还没有关注的 UP 主</p>
    <button v-if="canToggle" type="button" class="view-all" @click="expanded = !expanded">
      {{ expanded ? '收起' : '查看全部' }}
    </button>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { FollowUserItem } from '@/types/api';

const props = defineProps<{
  items: FollowUserItem[];
}>();

const PREVIEW_COUNT = 5;
const expanded = ref(false);

const canToggle = computed(() => props.items.length > PREVIEW_COUNT);
const visibleItems = computed(() => (expanded.value ? props.items : props.items.slice(0, PREVIEW_COUNT)));

watch(
  () => props.items.length,
  (length) => {
    if (length <= PREVIEW_COUNT) {
      expanded.value = false;
    }
  },
);
</script>

<style scoped>
.sidebar-card {
  display: grid;
  gap: 16px;
  padding: 20px;
  border: 1px solid var(--color-border);
  border-radius: 18px;
  background: var(--color-bg-card);
  box-shadow: var(--gl-shadow-card);
}

.sidebar-head,
.user-item,
.view-all {
  display: flex;
  align-items: center;
}

.sidebar-head {
  justify-content: space-between;
}

.sidebar-head h2 {
  margin: 0;
  color: var(--color-text-main);
  font-size: 18px;
}

.sidebar-head span {
  color: var(--color-text-secondary);
  font-size: 13px;
  font-weight: 800;
}

.user-list {
  display: grid;
  gap: 14px;
}

.user-list.expanded {
  max-height: min(360px, 56dvh);
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-right: 6px;
  scrollbar-color: rgba(37, 99, 235, 0.44) rgba(226, 232, 240, 0.72);
  scrollbar-gutter: stable;
  scrollbar-width: thin;
}

.user-list.expanded::-webkit-scrollbar {
  width: 8px;
}

.user-list.expanded::-webkit-scrollbar-track {
  border-radius: 999px;
  background: rgba(226, 232, 240, 0.78);
}

.user-list.expanded::-webkit-scrollbar-thumb {
  border: 2px solid transparent;
  border-radius: 999px;
  background: rgba(100, 116, 139, 0.68);
  background-clip: content-box;
}

.user-list.expanded::-webkit-scrollbar-thumb:hover {
  background: rgba(37, 99, 235, 0.76);
  background-clip: content-box;
}

.user-item {
  gap: 10px;
}

.user-item img,
.avatar-fallback {
  width: 38px;
  height: 38px;
  border-radius: 50%;
}

.user-item img {
  object-fit: cover;
}

.avatar-fallback {
  display: grid;
  place-items: center;
  background: var(--color-primary-light);
  color: var(--color-primary);
  font-weight: 900;
}

.user-item strong {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  color: var(--color-text-main);
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.followed {
  flex: 0 0 auto;
  padding: 5px 10px;
  border-radius: 999px;
  background: var(--color-bg-muted);
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 800;
}

.view-all {
  justify-content: center;
  min-height: 34px;
  border: 0;
  border-top: 1px solid var(--color-border-soft);
  padding-top: 14px;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  font-size: 13px;
  font-weight: 800;
}

.view-all:hover {
  color: var(--color-primary);
}

.sidebar-empty {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 13px;
}

@media (max-width: 560px) {
  .user-list.expanded {
    max-height: 42dvh;
  }
}
</style>
