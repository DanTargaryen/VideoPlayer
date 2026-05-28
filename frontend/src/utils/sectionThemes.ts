import type { RouteLocationNormalizedLoaded } from 'vue-router';

export type SectionThemeKey =
  | 'recommend'
  | 'entertainment'
  | 'study'
  | 'game'
  | 'tech'
  | 'animation'
  | 'life'
  | 'music'
  | 'film'
  | 'sports'
  | 'comedy'
  | 'food'
  | 'travel'
  | 'live'
  | 'default';

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
  animation: {
    key: 'animation',
    label: '动画',
    eyebrow: 'Animation',
    className: 'theme-animation',
  },
  life: {
    key: 'life',
    label: '生活',
    eyebrow: 'Lifestyle',
    className: 'theme-life',
  },
  music: {
    key: 'music',
    label: '音乐',
    eyebrow: 'Music Loop',
    className: 'theme-music',
  },
  film: {
    key: 'film',
    label: '影视',
    eyebrow: 'Screen',
    className: 'theme-film',
  },
  sports: {
    key: 'sports',
    label: '运动',
    eyebrow: 'Sports Desk',
    className: 'theme-sports',
  },
  comedy: {
    key: 'comedy',
    label: '搞笑',
    eyebrow: 'Comedy',
    className: 'theme-comedy',
  },
  food: {
    key: 'food',
    label: '美食',
    eyebrow: 'Food Club',
    className: 'theme-food',
  },
  travel: {
    key: 'travel',
    label: '旅行',
    eyebrow: 'Travel Log',
    className: 'theme-travel',
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

  if (route.path.startsWith('/animation')) {
    return 'animation';
  }

  if (route.path.startsWith('/life')) {
    return 'life';
  }

  if (route.path.startsWith('/music')) {
    return 'music';
  }

  if (route.path.startsWith('/film')) {
    return 'film';
  }

  if (route.path.startsWith('/sports')) {
    return 'sports';
  }

  if (route.path.startsWith('/comedy')) {
    return 'comedy';
  }

  if (route.path.startsWith('/food')) {
    return 'food';
  }

  if (route.path.startsWith('/travel')) {
    return 'travel';
  }

  if (route.path.startsWith('/live')) {
    return 'live';
  }

  return 'default';
}

export function resolveSectionTheme(route: RouteLocationNormalizedLoaded) {
  return sectionThemes[resolveSectionThemeKey(route)];
}
