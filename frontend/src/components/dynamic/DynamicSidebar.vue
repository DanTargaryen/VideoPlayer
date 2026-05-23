<template>
  <aside class="dynamic-sidebar">
    <SidebarLiveList :items="liveItems" />
    <SidebarRecentUpdates :items="recentUpdates" />
    <SidebarFollowingUsers :items="followingUsers" />
    <SidebarRecommendedUsers
      :items="recommendedUsers"
      :loading-user-id="loadingUserId"
      @follow="$emit('follow', $event)"
      @refresh="$emit('refreshRecommended')"
    />
  </aside>
</template>

<script setup lang="ts">
import type {
  FollowUserItem,
  SidebarLiveItem,
  SidebarRecentUpdateItem,
  SidebarRecommendedUser,
} from '@/types/api';
import SidebarFollowingUsers from './SidebarFollowingUsers.vue';
import SidebarLiveList from './SidebarLiveList.vue';
import SidebarRecentUpdates from './SidebarRecentUpdates.vue';
import SidebarRecommendedUsers from './SidebarRecommendedUsers.vue';

defineProps<{
  liveItems: SidebarLiveItem[];
  recentUpdates: SidebarRecentUpdateItem[];
  followingUsers: FollowUserItem[];
  recommendedUsers: SidebarRecommendedUser[];
  loadingUserId?: string;
}>();

defineEmits<{
  follow: [user: SidebarRecommendedUser];
  refreshRecommended: [];
}>();
</script>

<style scoped>
.dynamic-sidebar {
  position: sticky;
  top: 84px;
  display: grid;
  align-content: start;
  gap: 18px;
  max-height: calc(100dvh - 104px);
  overflow-y: auto;
  padding-right: 4px;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: rgba(100, 116, 139, 0.28) transparent;
}

.dynamic-sidebar::-webkit-scrollbar {
  width: 6px;
}

.dynamic-sidebar::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(100, 116, 139, 0.28);
}

.dynamic-sidebar::-webkit-scrollbar-track {
  background: transparent;
}

@media (max-width: 1120px) {
  .dynamic-sidebar {
    position: static;
    max-height: none;
    overflow: visible;
    padding-right: 0;
  }
}
</style>
