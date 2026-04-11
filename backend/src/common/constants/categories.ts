export const CATEGORY_DEFINITIONS = [
  { code: 'recommend', label: '推荐' },
  { code: 'entertainment', label: '娱乐' },
  { code: 'study', label: '学习' },
  { code: 'game', label: '游戏' },
  { code: 'tech', label: '科技' },
  { code: 'live', label: '直播' },
] as const;

export type CategoryCode = (typeof CATEGORY_DEFINITIONS)[number]['code'];

export const VIDEO_CATEGORY_CODES: readonly CategoryCode[] = ['entertainment', 'study', 'game', 'tech'] as const;

export function resolveCategoryCode(categoryCode?: string): CategoryCode | undefined {
  if (!categoryCode || categoryCode === 'recommend') {
    return undefined;
  }

  const matched = CATEGORY_DEFINITIONS.find((item) => item.code === categoryCode);
  return matched?.code;
}
