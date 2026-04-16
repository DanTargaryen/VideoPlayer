export const CATEGORY_CODE_TO_ID = {
  entertainment: 1,
  study: 2,
  game: 3,
  tech: 4,
  live: 5,
} as const;

export const CATEGORY_DEFINITIONS = [
  { code: 'recommend', label: '推荐', id: null },
  { code: 'entertainment', label: '娱乐', id: CATEGORY_CODE_TO_ID.entertainment },
  { code: 'study', label: '学习', id: CATEGORY_CODE_TO_ID.study },
  { code: 'game', label: '游戏', id: CATEGORY_CODE_TO_ID.game },
  { code: 'tech', label: '科技', id: CATEGORY_CODE_TO_ID.tech },
  { code: 'live', label: '直播', id: CATEGORY_CODE_TO_ID.live },
] as const;

export type CategoryCode = (typeof CATEGORY_DEFINITIONS)[number]['code'];

export const VIDEO_CATEGORY_CODES: readonly CategoryCode[] = ['entertainment', 'study', 'game', 'tech'] as const;

export function resolveCategoryId(categoryCode?: string) {
  if (!categoryCode || categoryCode === 'recommend') {
    return undefined;
  }

  return CATEGORY_CODE_TO_ID[categoryCode as keyof typeof CATEGORY_CODE_TO_ID];
}

export function resolveCategoryCode(categoryCode?: string): CategoryCode | undefined {
  if (!categoryCode || categoryCode === 'recommend') {
    return undefined;
  }

  const matched = CATEGORY_DEFINITIONS.find((item) => item.code === categoryCode);
  return matched?.code;
}
