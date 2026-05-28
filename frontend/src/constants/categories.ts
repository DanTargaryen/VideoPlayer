export const categoryOptions = [
  { code: 'recommend', label: '推荐' },
  { code: 'entertainment', label: '娱乐' },
  { code: 'study', label: '学习' },
  { code: 'game', label: '游戏' },
  { code: 'tech', label: '科技' },
  { code: 'live', label: '直播' },
  { code: 'animation', label: '动画' },
  { code: 'life', label: '生活' },
  { code: 'music', label: '音乐' },
  { code: 'film', label: '影视' },
  { code: 'sports', label: '运动' },
  { code: 'comedy', label: '搞笑' },
  { code: 'food', label: '美食' },
  { code: 'travel', label: '旅行' },
] as const;

export type CategoryCode = (typeof categoryOptions)[number]['code'];

export const videoCategoryOptions = [
  { code: 'entertainment', label: '娱乐' },
  { code: 'study', label: '学习' },
  { code: 'game', label: '游戏' },
  { code: 'tech', label: '科技' },
  { code: 'animation', label: '动画' },
  { code: 'life', label: '生活' },
  { code: 'music', label: '音乐' },
  { code: 'film', label: '影视' },
  { code: 'sports', label: '运动' },
  { code: 'comedy', label: '搞笑' },
  { code: 'food', label: '美食' },
  { code: 'travel', label: '旅行' },
] as const;

export type VideoCategoryCode = (typeof videoCategoryOptions)[number]['code'];

export function normalizeCategoryCode(value?: string) {
  if (!value) {
    return 'recommend';
  }

  const matched = categoryOptions.find((item) => item.code === value);
  return matched?.code ?? 'recommend';
}

export function formatCategoryLabel(value?: string | null) {
  if (!value) {
    return '视频';
  }

  const matched = categoryOptions.find((item) => item.code === value);
  return matched?.label ?? value;
}

export function normalizeVideoCategories(value?: string[] | null, fallback?: string | null) {
  const validCodes = new Set(videoCategoryOptions.map((item) => item.code));
  const normalized = Array.from(
    new Set((value ?? []).filter((item): item is VideoCategoryCode => validCodes.has(item as VideoCategoryCode))),
  );

  if (normalized.length > 0) {
    return normalized;
  }

  return validCodes.has(fallback as VideoCategoryCode) ? [fallback as VideoCategoryCode] : [];
}
