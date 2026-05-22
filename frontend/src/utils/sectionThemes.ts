import type { RouteLocationNormalizedLoaded } from 'vue-router';

export type SectionThemeKey = 'recommend' | 'entertainment' | 'study' | 'game' | 'tech' | 'live' | 'default';

export type SectionTheme = {
  key: SectionThemeKey;
  label: string;
  eyebrow: string;
  className: string;
};

export const sectionThemes: Record<SectionThemeKey, SectionTheme> = {
  recommend: {
    key: 'recommend',
    label: '推荐',
    eyebrow: 'For You',
    className: 'theme-recommend',
  },
  entertainment: {
    key: 'entertainment',
    label: '娱乐',
    eyebrow: 'Show Time',
    className: 'theme-entertainment',
  },
  study: {
    key: 'study',
    label: '学习',
    eyebrow: 'Study Lab',
    className: 'theme-study',
  },
  game: {
    key: 'game',
    label: '游戏',
    eyebrow: 'Game Zone',
    className: 'theme-game',
  },
  tech: {
    key: 'tech',
    label: '科技',
    eyebrow: 'Tech Feed',
    className: 'theme-tech',
  },
  live: {
    key: 'live',
    label: '直播',
    eyebrow: 'On Air',
    className: 'theme-live',
  },
  default: {
    key: 'default',
    label: '观澜',
    eyebrow: 'Guanlan',
    className: 'theme-default',
  },
};

export function resolveSectionThemeKey(route: RouteLocationNormalizedLoaded): SectionThemeKey {
  if (route.path === '/') {
    return 'recommend';
  }

  if (route.path.startsWith('/entertainment')) {
    return 'entertainment';
  }

  if (route.path.startsWith('/study')) {
    return 'study';
  }

  if (route.path.startsWith('/game')) {
    return 'game';
  }

  if (route.path.startsWith('/tech')) {
    return 'tech';
  }

  if (route.path.startsWith('/live')) {
    return 'live';
  }

  return 'default';
}

export function resolveSectionTheme(route: RouteLocationNormalizedLoaded) {
  return sectionThemes[resolveSectionThemeKey(route)];
}
