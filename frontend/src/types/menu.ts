import type { CategoryCode } from '@/constants/categories';

export interface NavItem {
  label: string;
  path: string;
  code?: CategoryCode;
}
