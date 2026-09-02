import { describe, expect, it } from 'vitest';

import { isPostLikeDynamicType, normalizeDynamicType } from './dynamicFeed';

const item = (type: any, extra: Record<string, unknown> = {}) => ({ id: '1', type, ...extra }) as any;

describe('dynamic feed normalization', () => {
  it.each(['video', 'image_text', 'text', 'image', 'live', 'recommend'])('preserves explicit %s types', (type) => expect(normalizeDynamicType(item(type))).toBe(type));
  it('maps a post with text and images to image_text', () => expect(normalizeDynamicType(item('post', { title: 'hello', images: ['a'] }))).toBe('image_text'));
  it('maps an image-only post to image', () => expect(normalizeDynamicType(item('post', { images: ['a'] }))).toBe('image'));
  it('maps a text-only post to text', () => expect(normalizeDynamicType(item('post', { description: 'hello' }))).toBe('text'));
  it('maps an empty post to text', () => expect(normalizeDynamicType(item('post'))).toBe('text'));
  it('ignores whitespace-only descriptions', () => expect(normalizeDynamicType(item('post', { description: '  ', images: ['a'] }))).toBe('image'));
  it('recognizes post as post-like', () => expect(isPostLikeDynamicType('post')).toBe(true));
  it.each(['image_text', 'text', 'image'])('recognizes %s as post-like', (type) => expect(isPostLikeDynamicType(type as any)).toBe(true));
  it.each(['video', 'live', 'recommend'])('does not classify %s as post-like', (type) => expect(isPostLikeDynamicType(type as any)).toBe(false));
});
