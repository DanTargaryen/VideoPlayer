<template>
  <aside class="left-sidebar">
    <section class="profile-card">
      <div class="profile-top">
        <img v-if="avatarUrl" :src="avatarUrl" :alt="nickname" class="profile-avatar" />
        <span v-else class="profile-avatar fallback">{{ nickname.slice(0, 1) }}</span>
        <div class="profile-copy">
          <div class="profile-name-row">
            <strong>{{ nickname }}</strong>
            <span>Lv5</span>
          </div>
          <p>热爱探索，持续创作中</p>
        </div>
      </div>
      <div class="profile-stats">
        <span v-for="stat in stats" :key="stat.label">
          <strong>{{ stat.value }}</strong>
          <small>{{ stat.label }}</small>
        </span>
      </div>
      <RouterLink to="/user/dashboard" class="homepage-link">
        <span class="link-icon">U</span>
        <span>我的主页</span>
      </RouterLink>
    </section>

    <section class="sidebar-panel">
      <header class="panel-head">
        <h2>关注分组</h2>
        <button type="button">管理</button>
      </header>
      <div class="group-list">
        <button
          v-for="group in groups"
          :key="group.id"
          type="button"
          class="group-item"
          :class="{ active: activeGroupId === group.id }"
          @click="$emit('update:activeGroupId', group.id)"
        >
          <span class="group-icon">{{ group.icon }}</span>
          <strong>{{ group.name }}</strong>
          <small>{{ group.count }}</small>
        </button>
      </div>
      <button type="button" class="new-group">
        <span>+</span>
        <strong>新建分组</strong>
      </button>
    </section>

    <section class="sidebar-panel live-panel">
      <header class="panel-head">
        <h2>正在直播</h2>
        <RouterLink to="/live">更多</RouterLink>
      </header>
      <div v-if="liveItems.length > 0" class="left-live-list">
        <RouterLink
          v-for="item in visibleLiveItems"
          :key="item.id"
          :to="`/live/${item.roomId}`"
          class="left-live-item"
        >
          <img v-if="item.avatar" :src="item.avatar" :alt="item.authorName" />
          <span v-else class="live-avatar-fallback">{{ item.authorName.slice(0, 1) }}</span>
          <span class="live-copy">
            <span>
              <strong>{{ item.authorName }}</strong>
              <em>直播中</em>
            </span>
            <small>{{ item.title }}</small>
            <small>{{ formatCompactNumber(item.viewerCount) }}观看</small>
          </span>
        </RouterLink>
      </div>
      <p v-else class="panel-empty">暂时没有正在直播的创作者</p>
      <RouterLink v-if="liveItems.length > 0" to="/live" class="all-live-link">查看全部直播</RouterLink>
    </section>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { FollowGroupItem, SidebarLiveItem, SidebarProfileStats } from '@/types/api';

const props = defineProps<{
  nickname: string;
  avatarUrl?: string;
  profileStats: SidebarProfileStats;
  groups: FollowGroupItem[];
  activeGroupId: string;
  liveItems: SidebarLiveItem[];
}>();

defineEmits<{
  'update:activeGroupId': [value: string];
}>();

const visibleLiveItems = computed(() => props.liveItems.slice(0, 3));
const stats = computed(() => [
  { label: '关注', value: formatCompactNumber(props.profileStats.followingCount) },
  { label: '粉丝', value: formatCompactNumber(props.profileStats.followerCount) },
  { label: '动态', value: formatCompactNumber(props.profileStats.dynamicCount) },
]);

function formatCompactNumber(value: number) {
  if (value >= 10000) return `${(value / 10000).toFixed(value >= 100000 ? 0 : 1)}万`;
  return String(value);
}
</script>

<style scoped>
.left-sidebar {
  position: sticky;
  top: 84px;
  display: grid;
  align-content: start;
  gap: 14px;
}

.profile-card,
.sidebar-panel {
  border: 1px solid var(--color-border);
  border-radius: 16px;
  background: var(--color-bg-card);
  box-shadow: var(--gl-shadow-card);
}

.profile-card {
  display: grid;
  gap: 15px;
  padding: 16px;
}

.profile-top {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.profile-avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  object-fit: cover;
  box-shadow: 0 8px 18px rgba(37, 99, 235, 0.13);
}

.profile-avatar.fallback,
.live-avatar-fallback {
  display: grid;
  place-items: center;
  background: var(--color-primary-light);
  color: var(--color-primary);
  font-weight: 900;
}

.profile-copy {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.profile-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.profile-name-row strong {
  overflow: hidden;
  color: var(--color-text-main);
  font-size: 15px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-name-row span {
  flex: 0 0 auto;
  padding: 2px 6px;
  border-radius: 6px;
  background: var(--color-primary-light);
  color: var(--color-primary);
  font-size: 11px;
  font-weight: 900;
}

.profile-copy p {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 12px;
  line-height: 1.35;
}

.profile-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  border-top: 1px solid var(--color-border-soft);
  border-bottom: 1px solid var(--color-border-soft);
}

.profile-stats span {
  display: grid;
  gap: 3px;
  justify-items: center;
  padding: 10px 4px;
}

.profile-stats span + span {
  border-left: 1px solid var(--color-border-soft);
}

.profile-stats strong {
  color: var(--color-text-main);
  font-size: 15px;
  font-variant-numeric: tabular-nums;
}

.profile-stats small {
  color: var(--color-text-secondary);
  font-size: 12px;
}

.homepage-link,
.new-group,
.all-live-link {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 36px;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  color: var(--color-text-main);
  font-size: 13px;
  font-weight: 800;
  transition: background var(--gl-transition), color var(--gl-transition), border-color var(--gl-transition),
    transform var(--gl-transition);
}

.homepage-link:hover,
.new-group:hover,
.all-live-link:hover {
  border-color: #bfdbfe;
  background: var(--color-primary-light);
  color: var(--color-primary);
}

.homepage-link:active,
.new-group:active,
.all-live-link:active {
  transform: translateY(1px) scale(0.99);
}

.link-icon,
.new-group span {
  display: grid;
  place-items: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--color-primary-light);
  color: var(--color-primary);
  font-size: 12px;
  font-weight: 900;
}

.sidebar-panel {
  display: grid;
  gap: 12px;
  padding: 16px;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.panel-head h2 {
  margin: 0;
  color: var(--color-text-main);
  font-size: 16px;
}

.panel-head button,
.panel-head a {
  border: 0;
  background: transparent;
  color: var(--color-primary);
  cursor: pointer;
  font-size: 12px;
  font-weight: 800;
}

.group-list {
  display: grid;
  gap: 4px;
}

.group-item {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  min-height: 36px;
  border: 0;
  border-radius: 999px;
  padding: 0 10px;
  background: transparent;
  color: var(--color-text-main);
  cursor: pointer;
  text-align: left;
  transition: background var(--gl-transition), color var(--gl-transition), transform var(--gl-transition);
}

.group-item:hover,
.group-item.active {
  background: var(--color-primary-light);
  color: var(--color-primary);
}

.group-item:active {
  transform: translateY(1px) scale(0.99);
}

.group-icon {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 8px;
  background: #f1f5f9;
  color: var(--color-primary);
  font-size: 12px;
  font-weight: 900;
}

.group-item.active .group-icon {
  background: #dbeafe;
}

.group-item strong {
  overflow: hidden;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.group-item small {
  color: inherit;
  font-size: 12px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.new-group {
  justify-self: start;
  min-height: 32px;
  padding: 0 14px;
  background: transparent;
  cursor: pointer;
}

.left-live-list {
  display: grid;
  gap: 12px;
}

.left-live-item {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  gap: 10px;
  align-items: start;
}

.left-live-item img,
.live-avatar-fallback {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}

.live-copy,
.live-copy span {
  min-width: 0;
}

.live-copy {
  display: grid;
  gap: 3px;
}

.live-copy span {
  display: flex;
  align-items: center;
  gap: 7px;
}

.live-copy strong {
  overflow: hidden;
  color: var(--color-text-main);
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.live-copy em {
  flex: 0 0 auto;
  border-radius: 5px;
  padding: 2px 5px;
  background: #fff1f2;
  color: var(--color-danger);
  font-size: 10px;
  font-style: normal;
  font-weight: 900;
}

.live-copy small,
.panel-empty {
  color: var(--color-text-secondary);
  font-size: 12px;
}

.live-copy small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.panel-empty {
  margin: 0;
  line-height: 1.6;
}

.all-live-link {
  border: 0;
  border-top: 1px solid var(--color-border-soft);
  border-radius: 0;
  padding-top: 12px;
  color: var(--color-primary);
}

@media (max-width: 1200px) {
  .left-sidebar {
    display: none;
  }
}
</style>
