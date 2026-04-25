import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';

import MainLayout from '@/layout/MainLayout.vue';
import HomeView from '@/views/home/HomeView.vue';
import CategoryView from '@/views/category/CategoryView.vue';
import SearchView from '@/views/search/SearchView.vue';
import VideoDetailView from '@/views/video/VideoDetailView.vue';
import LiveRoomView from '@/views/live/LiveRoomView.vue';
import CreatorDashboardView from '@/views/creator/CreatorDashboardView.vue';
import AdminDashboardView from '@/views/admin/AdminDashboardView.vue';
import LoginView from '@/views/auth/LoginView.vue';
import RegisterView from '@/views/auth/RegisterView.vue';
import NotificationsView from '@/views/notification/NotificationsView.vue';
import FollowingFeedView from '@/views/following/FollowingFeedView.vue';
import UserHomepageView from '@/views/profile/UserHomepageView.vue';
import UploadView from '@/views/upload/UploadView.vue';
import { useAppStore } from '@/stores/app';
import pinia from '@/stores/pinia';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: MainLayout,
    children: [
      { path: '', name: 'home', component: HomeView },
      { path: 'search', name: 'search', component: SearchView },
      { path: 'entertainment', name: 'category-entertainment', component: CategoryView, props: { category: 'entertainment' } },
      { path: 'study', name: 'category-study', component: CategoryView, props: { category: 'study' } },
      { path: 'game', name: 'category-game', component: CategoryView, props: { category: 'game' } },
      { path: 'tech', name: 'category-tech', component: CategoryView, props: { category: 'tech' } },
      { path: 'video/:id', name: 'video-detail', component: VideoDetailView },
      { path: 'live/:id?', alias: 'live', name: 'live-room', component: LiveRoomView },
      { path: 'user/dashboard', alias: 'creator/dashboard', name: 'user-dashboard', component: CreatorDashboardView },
      { path: 'admin/dashboard', name: 'admin-dashboard', component: AdminDashboardView, meta: { adminOnly: true } },
      { path: 'login', name: 'login', component: LoginView },
      { path: 'register', name: 'register', component: RegisterView },
      { path: 'notifications', name: 'notifications', component: NotificationsView },
      { path: 'following', name: 'following-feed', component: FollowingFeedView },
      { path: 'upload', name: 'upload', component: UploadView },
      { path: 'users/:id', name: 'user-homepage', component: UserHomepageView },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to) => {
  const store = useAppStore(pinia);

  if (to.meta.adminOnly && store.role !== 'admin') {
    return '/login';
  }

  return true;
});

export default router;
