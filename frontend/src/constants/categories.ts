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

  const code = extractCategoryCode(value);
  if (!code) {
    return '视频';
  }

  const matched = videoCategoryOptions.find((item) => item.code === code)
    ?? categoryOptions.find((item) => item.code === code);
  return matched?.label ?? code;
}

type CategoryCodeInput = string | { code?: string | null } | null | undefined;

export function extractCategoryCode(value: CategoryCodeInput): string | null {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    if (trimmed.startsWith('{') && trimmed.includes('code')) {
      try {
        const parsed = JSON.parse(trimmed) as { code?: string };
        if (typeof parsed.code === 'string' && parsed.code.trim()) {
          return parsed.code.trim();
        }
      } catch {
        // Ignore malformed JSON and fall back to the raw string.
      }
    }

    return trimmed;
  }

  if (typeof value.code === 'string' && value.code.trim()) {
    return value.code.trim();
  }

  return null;
}

export function resolveVideoCategoryCodes(video: {
  category?: string | null;
  categories?: unknown;
}): string[] {
  const fromList = Array.isArray(video.categories)
    ? video.categories
        .map((item) => extractCategoryCode(item as CategoryCodeInput))
        .filter((item): item is string => Boolean(item))
    : [];

  const fallback = extractCategoryCode(video.category);
  return normalizeVideoCategories(fromList.length > 0 ? fromList : fallback ? [fallback] : [], fallback);
}

export function formatVideoCategoryLabels(video: {
  category?: string | null;
  categories?: unknown;
}): string[] {
  return resolveVideoCategoryCodes(video).map((code) => formatCategoryLabel(code));
}

export function normalizeVideoCategories(value?: string[] | null, fallback?: string | null) {
  const validCodes = new Set(videoCategoryOptions.map((item) => item.code));
  const fallbackCode = extractCategoryCode(fallback);
  const normalized = Array.from(
    new Set(
      [
        ...(fallbackCode && validCodes.has(fallbackCode as VideoCategoryCode)
          ? [fallbackCode as VideoCategoryCode]
          : []),
        ...(value ?? [])
          .map((item) => extractCategoryCode(item))
          .filter((item): item is VideoCategoryCode => Boolean(item && validCodes.has(item as VideoCategoryCode))),
      ],
    ),
  );

  return normalized;
}
