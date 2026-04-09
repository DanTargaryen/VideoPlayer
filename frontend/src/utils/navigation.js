import { categoryOptions } from '@/constants/categories';
export const primaryNavItems = categoryOptions.map((item) => ({
    label: item.label,
    path: item.code === 'recommend' ? '/' : item.code === 'live' ? '/live' : `/search?tab=video&category=${item.code}`,
}));
