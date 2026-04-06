import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';

import MainLayout from '@/layout/MainLayout.vue';
import HomeView from '@/views/home/HomeView.vue';
import SearchView from '@/views/search/SearchView.vue';
import VideoDetailView from '@/views/video/VideoDetailView.vue';
import LiveRoomView from '@/views/live/LiveRoomView.vue';
import CreatorDashboardView from '@/views/creator/CreatorDashboardView.vue';
import AdminDashboardView from '@/views/admin/AdminDashboardView.vue';
import LoginView from '@/views/auth/LoginView.vue';
import NotificationsView from '@/views/notification/NotificationsView.vue';
import FollowingFeedView from '@/views/following/FollowingFeedView.vue';
import UserHomepageView from '@/views/profile/UserHomepageView.vue';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: MainLayout,
    children: [
      {
        path: '',
        name: 'home',
        component: HomeView,
      },
      {
        path: 'search',
        name: 'search',
        component: SearchView,
      },
      {
        path: 'video/:id',
        name: 'video-detail',
        component: VideoDetailView,
      },
      {
        path: 'live/:id',
        name: 'live-room',
        component: LiveRoomView,
      },
      {
        path: 'user/dashboard',
        alias: 'creator/dashboard',
        name: 'user-dashboard',
        component: CreatorDashboardView,
      },
      {
        path: 'admin/dashboard',
        name: 'admin-dashboard',
        component: AdminDashboardView,
      },
      {
        path: 'login',
        name: 'login',
        component: LoginView,
      },
      {
        path: 'notifications',
        name: 'notifications',
        component: NotificationsView,
      },
      {
        path: 'following',
        name: 'following-feed',
        component: FollowingFeedView,
      },
      {
        path: 'users/:id',
        name: 'user-homepage',
        component: UserHomepageView,
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
