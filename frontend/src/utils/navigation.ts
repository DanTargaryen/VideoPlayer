import { categoryOptions } from '@/constants/categories';
import type { NavItem } from '@/types/menu';

export const primaryNavItems: NavItem[] = categoryOptions.map((item) => ({
  label: item.label,
  path: item.code === 'recommend' ? '/' : item.code === 'live' ? '/live' : `/search?tab=video&category=${item.code}`,
}));
