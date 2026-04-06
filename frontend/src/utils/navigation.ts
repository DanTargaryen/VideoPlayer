import type { NavItem } from '@/types/menu';

export const primaryNavItems: NavItem[] = [
  { label: '推荐', path: '/' },
  { label: '娱乐', path: '/search?tab=video&category=entertainment' },
  { label: '学习', path: '/search?tab=video&category=study' },
  { label: '游戏', path: '/search?tab=video&category=game' },
  { label: '科技', path: '/search?tab=video&category=tech' },
  { label: '直播', path: '/search?tab=live' },
];
