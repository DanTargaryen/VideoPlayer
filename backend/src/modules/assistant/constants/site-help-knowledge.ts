export interface SiteHelpKnowledgeItem {
  id: string;
  title: string;
  keywords: string[];
  content: string;
  suggestions: string[];
}

export interface SiteHelpKnowledgeMatch {
  item: SiteHelpKnowledgeItem;
  score: number;
}

const SITE_HELP_KNOWLEDGE: SiteHelpKnowledgeItem[] = [
  {
    id: 'site-overview',
    title: '网站功能总览',
    keywords: ['网站有哪些功能', '网站功能', '平台功能', '功能介绍', '有哪些功能', '这个网站能做什么', '网站能做什么', '新手教程', '使用指南', '网站板块'],
    content: [
      '这个网站目前的核心功能可以概括为：',
      '',
      '1. 首页推荐：浏览推荐视频、分类内容和热门内容。',
      '2. 搜索功能：按关键词查找视频、用户和直播。',
      '3. 视频详情：观看视频、发弹幕、点赞、收藏、投币、评论，还能召唤视频智能体。',
      '4. 投稿上传：上传视频、填写标题简介、选择分区、设置封面，并创建稿件。',
      '5. 个人中心：管理自己的作品、收藏、点赞记录和账号设置。',
      '6. 直播中心：观看直播或进入自己的直播工作台开播。',
      '7. 动态广场：发布图文动态，浏览关注内容和社区互动。',
      '8. 消息中心：查看私信和未读消息。',
      '9. 登录注册：完成账号登录、注册和找回密码。',
      '10. 管理员审核：在后台审核视频和文本内容。',
      '',
      '如果你想了解某一个功能的具体操作，我可以继续按页面一步一步讲给你。',
    ].join('\n'),
    suggestions: ['如何投稿视频？', '怎么搜索视频？', '怎么开直播？'],
  },
  {
    id: 'upload-video',
    title: '投稿视频',
    keywords: ['投稿', '上传视频', '视频投稿', '发布视频', '发视频', '传视频', '创建稿件', '上传入口', '/upload'],
    content: [
      '当然可以，投稿视频可以这样做：',
      '',
      '1. 先登录账号；未登录时点击“上传”会先跳到登录页。',
      '2. 点击页面顶部右侧的“上传”图标，进入投稿页 `/upload`。',
      '3. 选择本地视频文件。',
      '4. 填写视频标题、简介，并至少选择一个分区。',
      '5. 可选填写封面图片 URL，或上传本地封面图片；不手动上传时，页面会尝试从视频中截取一张作为封面。',
      '6. 点击“创建稿件”，系统会上传视频并创建草稿。',
      '7. 创建成功后会回到个人中心 `/user/dashboard`。',
      '8. 在“我的作品”里找到草稿，点击“提交审核”。',
      '9. 审核通过后，视频状态会变为“已发布”，其他用户就能观看。',
      '',
      '小提示：如果只是创建了稿件但没有提交审核，它仍然是草稿状态，不会正式公开。',
    ].join('\n'),
    suggestions: ['怎么上传封面？', '投稿后为什么要审核？', '在哪里看我的稿件？'],
  },
  {
    id: 'upload-cover',
    title: '上传封面',
    keywords: ['封面', '上传封面', '视频封面', '封面图片', '自动截取封面', '封面 URL'],
    content: [
      '视频封面有三种处理方式：',
      '',
      '1. 在投稿页填写“封面图片 URL”。',
      '2. 在投稿页选择本地封面图片上传。',
      '3. 不手动上传封面时，页面会尝试从视频里截取一帧作为自动封面。',
      '',
      '如果你已经创建了稿件，也可以回到个人中心 `/user/dashboard`，在“我的作品”里编辑稿件信息。',
    ].join('\n'),
    suggestions: ['如何投稿视频？', '怎么编辑稿件？', '投稿后为什么要审核？'],
  },
  {
    id: 'creator-dashboard',
    title: '个人中心与稿件管理',
    keywords: ['个人中心', '创作者中心', '我的作品', '稿件管理', '查看稿件', '编辑稿件', '删除视频', '撤回审核'],
    content: [
      '你可以在个人中心管理自己的稿件：',
      '',
      '1. 登录后点击右上角头像，进入 `/user/dashboard`。',
      '2. 在“我的作品”里查看自己创建的视频。',
      '3. 草稿或被驳回的视频可以点击“提交审核”。',
      '4. 待审核的视频可以撤回审核。',
      '5. 支持编辑稿件信息、查看审核记录，也可以删除自己的视频。',
    ].join('\n'),
    suggestions: ['如何投稿视频？', '投稿后为什么要审核？', '怎么查看消息通知？'],
  },
  {
    id: 'review-video',
    title: '投稿审核',
    keywords: ['审核', '提交审核', '待审核', '审核通过', '审核记录', '驳回', '发布', '已发布'],
    content: [
      '投稿后的审核流程是这样的：',
      '',
      '1. 投稿页创建成功后，视频先是草稿。',
      '2. 回到个人中心 `/user/dashboard`，在“我的作品”里点击“提交审核”。',
      '3. 视频进入“待审核”状态，管理员会在审核后台处理。',
      '4. 审核通过后会变成“已发布”。',
      '5. 如果被驳回，可以查看审核记录和驳回原因，修改后重新提交。',
    ].join('\n'),
    suggestions: ['如何投稿视频？', '在哪里看我的稿件？', '管理员怎么审核视频？'],
  },
  {
    id: 'search-video',
    title: '搜索视频',
    keywords: ['搜索', '查找', '找视频', '搜索视频', '关键词', 'UP主', '内容', '/search'],
    content: [
      '搜索视频可以这样用：',
      '',
      '1. 在顶部搜索框输入关键词。',
      '2. 按回车或点击搜索，进入 `/search` 搜索页。',
      '3. 搜索页会按关键词展示相关视频，也可以继续调整关键词。',
      '4. 如果你想找某个 UP 主或内容，也可以直接把名字或主题作为关键词搜索。',
    ].join('\n'),
    suggestions: ['如何投稿视频？', '怎么发评论？', '怎么收藏视频？'],
  },
  {
    id: 'video-interaction',
    title: '视频互动',
    keywords: ['评论', '发评论', '回复评论', '弹幕', '发弹幕', '点赞', '收藏', '投币', '@grok', '智能体'],
    content: [
      '在视频详情页可以进行这些互动：',
      '',
      '1. 播放视频时可以发送弹幕。',
      '2. 在评论区可以发表评论、回复评论，也可以上传评论图片。',
      '3. 可以点赞、收藏视频，也可以给视频投币。',
      '4. 评论里提到 `@grok` 或智能体相关关键词时，页面会展示智能体回复相关逻辑。',
      '',
      '如果按钮没有反应，先确认自己是否已经登录。',
    ].join('\n'),
    suggestions: ['怎么发弹幕？', '怎么发评论？', '怎么收藏视频？'],
  },
  {
    id: 'live',
    title: '直播功能',
    keywords: ['直播', '开直播', '开播', '直播间', '直播中心', '直播广场', '关播', '直播回放', '录播'],
    content: [
      '直播功能可以这样理解：',
      '',
      '1. 点击顶部导航里的“直播”，进入直播相关页面。',
      '2. 可以在直播广场浏览正在直播的房间。',
      '3. 主播可以创建直播间，并开始或结束直播。',
      '4. 直播结束后，项目里也预留了回放保存为视频稿件的接口能力。',
      '',
      '如果你想开播，建议先登录，再进入直播中心或自己的直播间操作。',
    ].join('\n'),
    suggestions: ['怎么开直播？', '直播回放怎么保存？', '如何投稿视频？'],
  },
  {
    id: 'messages',
    title: '消息通知',
    keywords: ['消息', '通知', '私信', '未读', '消息中心', '/messages'],
    content: [
      '消息通知入口在页面右上角：',
      '',
      '1. 登录后，顶部右侧会显示“消息”入口。',
      '2. 有未读消息时，图标旁会显示未读数量。',
      '3. 点击后进入 `/messages` 查看通知或私信。',
      '4. 未登录时点击消息入口会跳到登录页。',
    ].join('\n'),
    suggestions: ['如何投稿视频？', '在哪里看我的稿件？', '怎么搜索视频？'],
  },
  {
    id: 'auth',
    title: '登录注册',
    keywords: ['登录', '注册', '账号', '密码', '忘记密码', '重置密码', '邮箱验证码'],
    content: [
      '账号相关功能可以这样使用：',
      '',
      '1. 点击页面右上角“登录”进入登录页。',
      '2. 没有账号时，可以进入注册流程创建账号。',
      '3. 忘记密码时，可以通过邮箱验证码相关流程重置。',
      '4. 投稿、消息、个人中心、直播开播等功能通常需要先登录。',
    ].join('\n'),
    suggestions: ['如何投稿视频？', '怎么查看消息通知？', '怎么开直播？'],
  },
  {
    id: 'admin-review',
    title: '管理员审核',
    keywords: ['管理员', '审核后台', '视频审核', '文本审核', '通过审核', '拒绝审核', '审核后台'],
    content: [
      '管理员审核的大致流程是：',
      '',
      '1. 管理员登录后可以进入审核后台。',
      '2. 在视频审核队列中查看用户提交的待审核稿件。',
      '3. 可以选择通过或驳回，并填写驳回原因。',
      '4. 通过后视频变为已发布；驳回后用户可以修改并重新提交。',
      '5. 项目里也有文本内容审核相关接口。',
    ].join('\n'),
    suggestions: ['投稿后为什么要审核？', '如何投稿视频？', '怎么查看审核记录？'],
  },
];

const TOKEN_PATTERN = /[\p{Script=Han}A-Za-z0-9_/@.-]+/gu;
const STOP_WORDS = new Set(['如何', '怎么', '怎样', '请问', '一下', '一个', '这个', '那个', '什么', '为什么', '可以', '是否', '我想', '我要']);

export function searchSiteHelpKnowledge(query: string, limit = 3): SiteHelpKnowledgeMatch[] {
  const normalizedQuery = normalizeText(query);
  const terms = extractTerms(query);

  if (!normalizedQuery && terms.length === 0) {
    return [];
  }

  return SITE_HELP_KNOWLEDGE.map((item) => ({ item, score: scoreKnowledgeItem(item, normalizedQuery, terms) }))
    .filter((match) => match.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
}

function scoreKnowledgeItem(item: SiteHelpKnowledgeItem, normalizedQuery: string, terms: string[]) {
  let score = 0;
  const normalizedTitle = normalizeText(item.title);
  const normalizedContent = normalizeText(item.content);

  if (item.id === 'site-overview' && /(网站|平台|功能|板块|页面|教程|使用指南|能做什么)/.test(normalizedQuery)) {
    score += 24;
  }

  if (normalizedTitle && normalizedQuery.includes(normalizedTitle)) {
    score += 16;
  }

  for (const keyword of item.keywords) {
    const normalizedKeyword = normalizeText(keyword);
    if (!normalizedKeyword) {
      continue;
    }

    if (normalizedQuery.includes(normalizedKeyword)) {
      score += normalizedKeyword.length >= 4 ? 12 : 8;
    }

    for (const term of terms) {
      if (term.length < 2) {
        continue;
      }

      if (normalizedKeyword.includes(term)) {
        score += term.length >= 3 ? 5 : 2;
      }
    }
  }

  for (const term of terms) {
    if (normalizedTitle.includes(term)) {
      score += 4;
    }

    if (normalizedContent.includes(term)) {
      score += 1;
    }
  }

  return score;
}

function extractTerms(query: string) {
  const rawTerms = query.match(TOKEN_PATTERN) ?? [];
  const terms = rawTerms
    .map((item) => normalizeText(item))
    .filter((item) => item.length >= 2 && !STOP_WORDS.has(item))
    .slice(0, 10);

  return Array.from(new Set(terms));
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, '').toLowerCase();
}
