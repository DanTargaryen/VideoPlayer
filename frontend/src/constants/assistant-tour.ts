import type { RouteLocationRaw } from 'vue-router';

import { fetchRecommendFeed } from '@/api/platform';

export type AssistantTourPlacement = 'auto' | 'top' | 'right' | 'bottom' | 'left';

export interface AssistantTourStep {
  id: string;
  title: string;
  description: string;
  route: RouteLocationRaw;
  selectors: string[];
  placement?: AssistantTourPlacement;
  highlightPadding?: number;
  requiresAuth?: boolean;
  transition?: string;
  nextLabel?: string;
}

interface CreateAssistantTourStepsOptions {
  isLoggedIn: boolean;
}

export async function createAssistantTourSteps(options: CreateAssistantTourStepsOptions): Promise<AssistantTourStep[]> {
  const sampleVideoId = await resolveSampleVideoId();
  const authEntryStep = options.isLoggedIn
    ? {
        id: 'account-entry',
        title: '账号与个人中心',
        description:
          '右上角头像是你的个人入口，可以进入个人中心管理稿件、收藏、点赞记录和账号设置。后面的投稿、动态和消息功能都需要登录账号。',
        route: '/',
        selectors: ['[data-tour="header-account"]', '[data-tour="header-upload"]', '[data-tour="site-header"]'],
        placement: 'bottom' as const,
        highlightPadding: 8,
        transition: '正常操作时，点击右上角“上传”会进入投稿页；如果你想先管理作品，也可以点击头像进入个人中心。教程下一步会带你进入投稿流程。',
        nextLabel: '前往投稿页',
      }
    : {
        id: 'login-entry',
        title: '先登录账号',
        description:
          '如果你想投稿、发布动态、查看消息或管理作品，需要先点击右上角“登录”。教程继续到需要登录的页面时，系统也会自动带你到登录页。',
        route: '/',
        selectors: ['[data-tour="header-login"]', '[data-tour="header-upload"]', '[data-tour="site-header"]'],
        placement: 'bottom' as const,
        highlightPadding: 8,
        transition: '正常操作时，点击右上角“上传”或“登录”都会先进入登录页。教程下一步会模拟点击上传；未登录时会先停在登录页。',
        nextLabel: '前往投稿页',
      };

  const steps: AssistantTourStep[] = [
    {
      id: 'home-recommend',
      title: '首页：发现推荐内容',
      description:
        '这里是首页推荐区。你可以浏览热门视频、分类频道和推荐视频流，点击任意视频卡片即可进入详情页观看。',
      route: '/',
      selectors: ['[data-tour="home-hero"]', '[data-tour="home-recommend-list"]', '[data-tour="home-category"]', '[data-tour="site-header"]'],
      placement: 'bottom',
      highlightPadding: 10,
      nextLabel: '认识搜索入口',
    },
    {
      id: 'header-search',
      title: '顶部搜索：快速找到内容',
      description:
        '顶部搜索框可以搜索视频、UP 主和内容关键词。输入关键词后会进入搜索页，并可以按视频、用户、直播继续筛选。',
      route: '/',
      selectors: ['[data-tour="header-search"]', '[data-tour="site-header"]'],
      placement: 'bottom',
      highlightPadding: 8,
      transition: '正常操作时，在搜索框输入关键词后按回车或点击搜索按钮，就会进入搜索结果页。下一步会先单独说明这个页面切换动作。',
      nextLabel: '学习搜索跳转',
    },
    {
      id: 'go-search-results',
      title: '页面切换：从搜索框进入搜索页',
      description:
        '想找指定内容时，先在顶部搜索框输入关键词，比如“希腊”，再按回车或点击搜索按钮。页面会切换到搜索结果页，并自动带上刚才输入的关键词。',
      route: '/',
      selectors: ['[data-tour="header-search"]', '[data-tour="site-header"]'],
      placement: 'bottom',
      highlightPadding: 8,
      nextLabel: '模拟搜索跳转',
    },
    {
      id: 'search-results',
      title: '搜索页：筛选视频、用户和直播',
      description:
        '搜索页支持按分区、排序和类型筛选结果。视频结果可继续点击进入详情页，用户结果可进入主页，直播结果可进入直播间。',
      route: { path: '/search', query: { keyword: '希腊', tab: 'video' } },
      selectors: ['[data-tour="search-results"]', '[data-tour="search-tabs"]', '[data-tour="search-filters"]'],
      placement: 'top',
      highlightPadding: 10,
      transition: sampleVideoId
        ? '正常操作时，点击任意视频卡片会进入视频详情页。下一步会先告诉你该点哪里，再模拟打开一个推荐视频。'
        : '正常操作时，可以点击顶部 Logo 回到首页，也可以通过顶部导航切换到直播、动态等页面。下一步会先说明如何回到首页。',
      nextLabel: sampleVideoId ? '学习进入详情' : '学习回到首页',
    },
    ...(sampleVideoId
      ? [
          {
            id: 'go-video-detail',
            title: '页面切换：点击视频卡片进入详情',
            description:
              '在搜索结果或首页推荐里，点击任意视频卡片，就会进入对应的视频详情页。教程下一步会替你打开一个示例视频。',
            route: { path: '/search', query: { keyword: '希腊', tab: 'video' } },
            selectors: ['[data-tour="search-results"]', '[data-tour="search-tabs"]'],
            placement: 'top' as const,
            highlightPadding: 10,
            nextLabel: '模拟点击视频',
          },
          {
            id: 'video-player',
            title: '视频详情：播放、弹幕与互动',
            description:
              '进入视频详情页后，中心区域用于播放视频；下方弹幕栏可以发送弹幕。继续往下可以点赞、收藏、投币、评论，也可以召唤视频智能体。',
            route: `/video/${sampleVideoId}`,
            selectors: ['[data-tour="video-player"]', '[data-tour="video-actions"]', '.watch-panel'],
            placement: 'right' as const,
            highlightPadding: 10,
            nextLabel: '查看评论区',
          },
          {
            id: 'video-comments',
            title: '评论区：交流与 @grok 智能回复',
            description:
              '评论区可以发表文字评论、上传评论图片，也可以输入 @grok 加问题来召唤视频评论智能体回复。',
            route: `/video/${sampleVideoId}`,
            selectors: ['[data-tour="video-comments"]', '[data-tour="video-comment-composer"]', '#comments'],
            placement: 'top' as const,
            highlightPadding: 10,
            transition: '正常操作时，可以通过顶部 Logo 返回首页，也可以继续用顶部导航切换到投稿、直播、动态和消息。下一步会先高亮回首页的入口。',
            nextLabel: '学习回到首页',
          },
          {
            id: 'back-home-from-video',
            title: '页面切换：用 Logo 回到首页',
            description:
              '无论你在视频详情、搜索页还是其他页面，点击左上角网站 Logo 都可以回到首页。教程下一步会模拟回到首页，再介绍账号和投稿入口。',
            route: `/video/${sampleVideoId}`,
            selectors: ['[data-tour="header-brand"]', '[data-tour="site-header"]'],
            placement: 'bottom' as const,
            highlightPadding: 8,
            nextLabel: '模拟回首页',
          },
        ]
      : [
          {
            id: 'back-home-from-search',
            title: '页面切换：用 Logo 回到首页',
            description:
              '如果当前停在搜索页，点击左上角网站 Logo 就能回到首页。教程下一步会回到首页，再介绍账号和投稿入口。',
            route: { path: '/search', query: { keyword: '希腊', tab: 'video' } },
            selectors: ['[data-tour="header-brand"]', '[data-tour="site-header"]'],
            placement: 'bottom' as const,
            highlightPadding: 8,
            nextLabel: '模拟回首页',
          },
        ]),
    authEntryStep,
    {
      id: 'go-upload-from-header',
      title: '页面切换：通过上传入口进入投稿页',
      description:
        '准备投稿时，点击右上角“上传”按钮即可进入投稿页。如果还没有登录，系统会先带你去登录页，登录完成后再继续投稿。',
      route: '/',
      selectors: ['[data-tour="header-upload"]', '[data-tour="site-header"]'],
      placement: 'bottom',
      highlightPadding: 8,
      nextLabel: '模拟进入投稿页',
    },
    {
      id: 'upload-video',
      title: '投稿页：上传并创建稿件',
      description:
        '点击顶部“上传”进入投稿页。这里可以选择本地视频、填写标题简介、选择分区、设置封面，然后点击“创建稿件”。如果你还没登录，会先进入登录页。',
      route: '/upload',
      selectors: ['[data-tour="upload-form"]', '[data-tour="upload-create"]', '[data-tour="login-card"]'],
      placement: 'left',
      highlightPadding: 10,
      requiresAuth: true,
      transition: '正常操作时，点击“创建稿件”成功后会回到个人中心；也可以点击“返回个人主页”手动进入。下一步会先说明这次切换。',
      nextLabel: '学习进入个人中心',
    },
    {
      id: 'go-creator-dashboard',
      title: '页面切换：创建后进入个人中心',
      description:
        '投稿信息填写完成并创建稿件后，页面通常会跳转到个人中心。你也可以点击右上角头像，随时进入个人中心管理自己的作品。',
      route: '/upload',
      selectors: ['[data-tour="upload-create"]', '[data-tour="header-account"]', '[data-tour="upload-form"]', '[data-tour="login-card"]'],
      placement: 'left',
      highlightPadding: 10,
      requiresAuth: true,
      nextLabel: '模拟进入个人中心',
    },
    {
      id: 'creator-dashboard',
      title: '个人中心：管理稿件与提交审核',
      description:
        '创建稿件后会回到个人中心。你可以在“我的作品”里查看草稿、编辑稿件、查看审核记录，并点击“提交审核”发布作品。',
      route: '/user/dashboard',
      selectors: ['[data-tour="creator-work-list"]', '[data-tour="creator-submit-review"]', '[data-tour="login-card"]'],
      placement: 'left',
      highlightPadding: 10,
      requiresAuth: true,
      transition: '正常操作时，想切换到直播功能，可以点击顶部导航里的“直播”。下一步会先高亮顶部导航。',
      nextLabel: '学习切到直播',
    },
    {
      id: 'go-live-center',
      title: '页面切换：从顶部导航进入直播',
      description:
        '顶部导航栏是切换主功能页的主要入口。点击“直播”后，页面会从个人中心切换到直播中心。',
      route: '/user/dashboard',
      selectors: ['[data-tour="header-nav-live"]', '[data-tour="header-nav"]', '[data-tour="site-header"]'],
      placement: 'bottom',
      highlightPadding: 8,
      requiresAuth: true,
      nextLabel: '模拟进入直播',
    },
    {
      id: 'live-center',
      title: '直播中心：观看直播与一键开播',
      description:
        '直播页可以浏览直播广场，也可以进入自己的直播工作台。登录后准备摄像头或屏幕共享，就能开始直播并与观众实时互动。',
      route: '/live',
      selectors: ['[data-tour="live-hero"]', '[data-tour="live-actions"]', '[data-tour="live-studio"]'],
      placement: 'bottom',
      highlightPadding: 10,
      transition: '正常操作时，点击顶部导航里的“动态”可以进入社区动态页。下一步会先说明导航切换。',
      nextLabel: '学习切到动态',
    },
    {
      id: 'go-dynamic-feed',
      title: '页面切换：从顶部导航进入动态',
      description:
        '仍然使用顶部导航栏，点击“动态”就能从直播中心切到社区动态页。推荐、直播、动态这几个主页面都可以通过这里切换。',
      route: '/live',
      selectors: ['[data-tour="header-nav-dynamic"]', '[data-tour="header-nav"]', '[data-tour="site-header"]'],
      placement: 'bottom',
      highlightPadding: 8,
      nextLabel: '模拟进入动态',
    },
    {
      id: 'dynamic-feed',
      title: '动态页：发布近况与浏览关注内容',
      description:
        '动态页用于发布文字、图片等近况，也能浏览关注用户和推荐内容。这里更像社区广场，适合做视频以外的轻量互动。',
      route: '/notifications',
      selectors: ['[data-tour="dynamic-composer"]', '[data-tour="dynamic-feed"]', '[data-tour="login-card"]'],
      placement: 'right',
      highlightPadding: 10,
      requiresAuth: true,
      transition: '正常操作时，点击顶部右侧“消息”可以进入消息中心；如果未登录，会先进入登录页。下一步会先高亮消息入口。',
      nextLabel: '学习进入消息',
    },
    {
      id: 'go-messages',
      title: '页面切换：从右上角进入消息中心',
      description:
        '私信和会话入口在右上角“消息”。点击后会进入消息中心；如果未登录，系统会先要求登录。',
      route: '/notifications',
      selectors: ['[data-tour="header-messages"]', '[data-tour="site-header"]', '[data-tour="login-card"]'],
      placement: 'bottom',
      highlightPadding: 8,
      requiresAuth: true,
      nextLabel: '模拟进入消息',
    },
    {
      id: 'messages',
      title: '消息中心：查看私信与会话',
      description:
        '消息中心会展示你的会话列表和私信内容。左侧选择联系人，右侧就能查看聊天记录并发送消息。',
      route: '/messages',
      selectors: ['[data-tour="messages-conversations"]', '[data-tour="messages-chat"]', '[data-tour="login-card"]'],
      placement: 'right',
      highlightPadding: 10,
      requiresAuth: true,
      transition: '教程最后会回到首页。下一步会再高亮一次 Logo，帮助你记住全站通用的返回首页方式。',
      nextLabel: '学习返回首页',
    },
    {
      id: 'back-home-from-messages',
      title: '页面切换：回首页再选择其他功能',
      description:
        '当你不知道下一步去哪里时，可以先点击左上角 Logo 回首页，再通过顶部导航、搜索框或右上角按钮进入其他功能。',
      route: '/messages',
      selectors: ['[data-tour="header-brand"]', '[data-tour="site-header"]'],
      placement: 'bottom',
      highlightPadding: 8,
      requiresAuth: true,
      nextLabel: '完成回顾',
    },
    {
      id: 'finish',
      title: '教程完成：你已经掌握基本流程',
      description:
        '到这里，你已经了解了首页浏览、搜索、观看互动、投稿审核、直播、动态和消息。之后遇到具体问题，也可以直接问澜澜。',
      route: '/',
      selectors: ['[data-tour="site-header"]', '[data-tour="home-hero"]', 'body'],
      placement: 'bottom',
      highlightPadding: 8,
    },
  ];

  return steps;
}

async function resolveSampleVideoId() {
  try {
    const feed = await fetchRecommendFeed({ page: 1, pageSize: 1 });
    const firstVideo = feed.find((item) => Number.isFinite(Number(item.id)));
    return firstVideo ? Number(firstVideo.id) : null;
  } catch {
    return null;
  }
}
