import { describe, expect, it } from 'vitest';
import { primaryNavItems } from './navigation';
import { resolveSectionTheme, resolveSectionThemeKey, sectionThemes } from './sectionThemes';

const route = (path: string) => ({ path }) as any;

describe('navigation and section themes', () => {
  it('starts navigation at recommend', () => expect(primaryNavItems[0]).toMatchObject({ code: 'recommend', path: '/' }));
  it('contains all category navigation entries', () => expect(primaryNavItems.length).toBeGreaterThanOrEqual(10));
  it('has unique navigation codes', () => expect(new Set(primaryNavItems.map((item) => item.code)).size).toBe(primaryNavItems.length));
  it('has labels for every navigation item', () => primaryNavItems.forEach((item) => expect(item.label.length).toBeGreaterThan(0)));
  it('maps live to live route', () => expect(primaryNavItems.find((item) => item.code === 'live')?.path).toBe('/live'));
  it('maps recommend to root route', () => expect(primaryNavItems.find((item) => item.code === 'recommend')?.path).toBe('/'));
  it('maps unknown category through search fallback', () => expect(primaryNavItems.every((item) => item.path.startsWith('/') || item.path.startsWith('/search'))).toBe(true));
  it('resolves root theme', () => expect(resolveSectionThemeKey(route('/'))).toBe('recommend'));
  it.each(['entertainment', 'study', 'game', 'tech', 'animation', 'life', 'music', 'film', 'sports', 'comedy', 'food', 'travel', 'live'])('resolves %s theme', (key) => expect(resolveSectionThemeKey(route(`/${key}/anything`))).toBe(key));
  it('falls back for video detail', () => expect(resolveSectionThemeKey(route('/video/1'))).toBe('default'));
  it('returns theme metadata', () => expect(resolveSectionTheme(route('/live'))).toMatchObject({ key: 'live', className: 'theme-live' }));
  it('has matching keys in theme map', () => Object.entries(sectionThemes).forEach(([key, theme]) => expect(theme.key).toBe(key)));
  it('has readable labels', () => Object.values(sectionThemes).forEach((theme) => expect(theme.label).not.toBe('')));
  it('has CSS class names', () => Object.values(sectionThemes).forEach((theme) => expect(theme.className).toMatch(/^theme-/)));
  it('keeps live eyebrow', () => expect(sectionThemes.live.eyebrow).toBe('On Air'));
  it('keeps default eyebrow', () => expect(sectionThemes.default.eyebrow).toBe('Guanlan'));
});
