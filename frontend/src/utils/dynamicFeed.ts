import type { DynamicFeedItem } from '@/types/api';

export type RenderDynamicType = 'video' | 'image_text' | 'text' | 'image' | 'live' | 'recommend';

export function normalizeDynamicType(item: DynamicFeedItem): RenderDynamicType {
  if (item.type === 'video' || item.type === 'image_text' || item.type === 'text' || item.type === 'image' || item.type === 'live') {
    return item.type;
  }

  if (item.type === 'recommend') {
    return 'recommend';
  }

  const hasText = Boolean((item.description ?? item.title ?? '').trim());
  const hasImages = (item.images?.length ?? 0) > 0;

  if (hasImages && hasText) return 'image_text';
  if (hasImages) return 'image';
  return 'text';
}

export function isPostLikeDynamicType(type: DynamicFeedItem['type']) {
  return type === 'post' || type === 'image_text' || type === 'text' || type === 'image';
}
