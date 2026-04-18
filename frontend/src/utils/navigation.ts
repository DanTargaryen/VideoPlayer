import { categoryOptions } from '@/constants/categories';
import type { NavItem } from '@/types/menu';

const categoryPathMap: Record<string, string> = {
  recommend: '/',
  live: '/live',
  entertainment: '/entertainment',
  study: '/study',
  game: '/game',
  tech: '/tech',
};

export const primaryNavItems: NavItem[] = categoryOptions.map((item) => ({
  label: item.label,
  path: categoryPathMap[item.code] ?? `/search?tab=video&category=${item.code}`,
}));
