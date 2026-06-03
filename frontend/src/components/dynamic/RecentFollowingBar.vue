<template>
  <section class="recent-following-card">
    <header>
      <h2>最近更新的关注</h2>
    </header>
    <div class="recent-scroll">
      <button
        type="button"
        class="recent-user all-user"
        :class="{ active: activeAuthorId === '' }"
        @click="$emit('select', '')"
      >
        <span class="all-avatar">全</span>
        <strong>全部关注</strong>
      </button>
      <button
        v-for="user in users"
        :key="user.id"
        type="button"
        class="recent-user"
        :class="{ active: activeAuthorId === String(user.id) }"
        @click="$emit('select', String(user.id))"
      >
        <span class="avatar-wrap">
          <img v-if="user.avatarUrl" :src="user.avatarUrl" :alt="user.nickname" />
          <span v-else class="avatar-fallback">{{ user.nickname.slice(0, 1) }}</span>
          <i aria-hidden="true"></i>
        </span>
        <strong>{{ user.nickname }}</strong>
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { FollowUserItem } from '@/types/api';

defineProps<{
  users: FollowUserItem[];
  activeAuthorId: string;
}>();

defineEmits<{
  select: [authorId: string];
}>();
</script>

<style scoped>
.recent-following-card {
  display: grid;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid var(--color-border);
  border-radius: 16px;
  background: var(--color-bg-card);
  box-shadow: var(--gl-shadow-card);
}

.recent-following-card header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.recent-following-card h2 {
  margin: 0;
  color: var(--color-text-main);
  font-size: 16px;
}

.recent-following-card header button {
  border: 0;
  background: transparent;
  color: var(--color-primary);
  cursor: pointer;
  font-size: 12px;
  font-weight: 800;
}

.recent-scroll {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  padding-bottom: 8px;
  scrollbar-color: rgba(37, 99, 235, 0.5) rgba(226, 232, 240, 0.9);
  scrollbar-gutter: stable both-edges;
  scrollbar-width: thin;
}

.recent-scroll::-webkit-scrollbar {
  height: 10px;
}

.recent-scroll::-webkit-scrollbar-track {
  border-radius: 999px;
  background: rgba(226, 232, 240, 0.9);
}

.recent-scroll::-webkit-scrollbar-thumb {
  border: 2px solid transparent;
  border-radius: 999px;
  background: rgba(100, 116, 139, 0.72);
  background-clip: content-box;
}

.recent-scroll::-webkit-scrollbar-thumb:hover {
  background: rgba(37, 99, 235, 0.78);
  background-clip: content-box;
}

.recent-user {
  display: grid;
  flex: 0 0 66px;
  gap: 7px;
  justify-items: center;
  border: 0;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  font-size: 12px;
  transition: color var(--gl-transition), transform var(--gl-transition);
}

.recent-user:hover,
.recent-user.active {
  color: var(--color-primary);
}

.recent-user:active {
  transform: translateY(1px) scale(0.98);
}

.avatar-wrap {
  position: relative;
}

.avatar-wrap img,
.avatar-fallback,
.all-avatar {
  width: 46px;
  height: 46px;
  border-radius: 50%;
}

.avatar-wrap img {
  object-fit: cover;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.08);
}

.avatar-fallback,
.all-avatar {
  display: grid;
  place-items: center;
  background: var(--color-primary-light);
  color: var(--color-primary);
  font-weight: 900;
}

.all-avatar {
  border: 1px solid #bfdbfe;
}

.avatar-wrap i {
  position: absolute;
  right: 1px;
  bottom: 2px;
  width: 9px;
  height: 9px;
  border: 2px solid #ffffff;
  border-radius: 50%;
  background: var(--color-primary);
}

.recent-user strong {
  width: 66px;
  overflow: hidden;
  font-size: 12px;
  line-height: 1.2;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
