export const CATEGORY_CODE_TO_ID = {
  entertainment: 1,
  study: 2,
  game: 3,
  tech: 4,
  live: 5,
  animation: 6,
  life: 7,
  music: 8,
  film: 9,
  sports: 10,
  comedy: 11,
  food: 12,
  travel: 13,
} as const;

export const CATEGORY_DEFINITIONS = [
  { code: 'recommend', label: '推荐', id: null },
  { code: 'entertainment', label: '娱乐', id: CATEGORY_CODE_TO_ID.entertainment },
  { code: 'study', label: '学习', id: CATEGORY_CODE_TO_ID.study },
  { code: 'game', label: '游戏', id: CATEGORY_CODE_TO_ID.game },
  { code: 'tech', label: '科技', id: CATEGORY_CODE_TO_ID.tech },
  { code: 'live', label: '直播', id: CATEGORY_CODE_TO_ID.live },
  { code: 'animation', label: '动画', id: CATEGORY_CODE_TO_ID.animation },
  { code: 'life', label: '生活', id: CATEGORY_CODE_TO_ID.life },
  { code: 'music', label: '音乐', id: CATEGORY_CODE_TO_ID.music },
  { code: 'film', label: '影视', id: CATEGORY_CODE_TO_ID.film },
  { code: 'sports', label: '运动', id: CATEGORY_CODE_TO_ID.sports },
  { code: 'comedy', label: '搞笑', id: CATEGORY_CODE_TO_ID.comedy },
  { code: 'food', label: '美食', id: CATEGORY_CODE_TO_ID.food },
  { code: 'travel', label: '旅行', id: CATEGORY_CODE_TO_ID.travel },
] as const;

export type CategoryCode = (typeof CATEGORY_DEFINITIONS)[number]['code'];

export const VIDEO_CATEGORY_CODES: readonly CategoryCode[] = [
  'entertainment',
  'tech',
  'animation',
  'game',
  'life',
  'study',
  'music',
  'film',
  'sports',
  'comedy',
  'food',
  'travel',
  'live',
] as const;

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
