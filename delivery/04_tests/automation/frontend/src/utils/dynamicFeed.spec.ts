import { describe, expect, it } from 'vitest';

import { isPostLikeDynamicType, normalizeDynamicType } from './dynamicFeed';
import type { DynamicFeedItem } from '@/types/api';

type DynamicFeedItemType = DynamicFeedItem['type'];

const item = (type: DynamicFeedItemType, extra: Partial<DynamicFeedItem> = {}): DynamicFeedItem => ({
  id: '1', type, source: 'following', author: { id: 'u1', username: 'user', avatar: null },
  actionText: '', title: '', createdAt: '', ...extra,
});

describe('dynamic feed normalization', () => {
  it.each<DynamicFeedItemType>(['video', 'image_text', 'text', 'image', 'live', 'recommend'])('preserves explicit %s types', (type) => expect(normalizeDynamicType(item(type))).toBe(type));
  it('maps a post with text and images to image_text', () => expect(normalizeDynamicType(item('post', { title: 'hello', images: ['a'] }))).toBe('image_text'));
  it('maps an image-only post to image', () => expect(normalizeDynamicType(item('post', { images: ['a'] }))).toBe('image'));
  it('maps a text-only post to text', () => expect(normalizeDynamicType(item('post', { description: 'hello' }))).toBe('text'));
  it('maps an empty post to text', () => expect(normalizeDynamicType(item('post'))).toBe('text'));
  it('ignores whitespace-only descriptions', () => expect(normalizeDynamicType(item('post', { description: '  ', images: ['a'] }))).toBe('image'));
  it('recognizes post as post-like', () => expect(isPostLikeDynamicType('post')).toBe(true));
  it.each<DynamicFeedItemType>(['image_text', 'text', 'image'])('recognizes %s as post-like', (type) => expect(isPostLikeDynamicType(type)).toBe(true));
  it.each<DynamicFeedItemType>(['video', 'live', 'recommend'])('does not classify %s as post-like', (type) => expect(isPostLikeDynamicType(type)).toBe(false));
});
