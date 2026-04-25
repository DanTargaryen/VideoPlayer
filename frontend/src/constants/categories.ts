export const categoryOptions = [
  { code: 'recommend', label: '推荐' },
  { code: 'entertainment', label: '娱乐' },
  { code: 'study', label: '学习' },
  { code: 'game', label: '游戏' },
  { code: 'tech', label: '科技' },
  { code: 'live', label: '直播' },
] as const;

export type CategoryCode = (typeof categoryOptions)[number]['code'];

export const videoCategoryOptions = [
  { code: 'entertainment', label: '娱乐' },
  { code: 'study', label: '学习' },
  { code: 'game', label: '游戏' },
  { code: 'tech', label: '科技' },
] as const;

export type VideoCategoryCode = (typeof videoCategoryOptions)[number]['code'];

export function normalizeCategoryCode(value?: string) {
  if (!value) {
    return 'recommend';
  }

  const matched = categoryOptions.find((item) => item.code === value);
  return matched?.code ?? 'recommend';
}
