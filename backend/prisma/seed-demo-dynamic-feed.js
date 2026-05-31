const {
  NotificationType,
  PrismaClient,
  TextStatus,
  UserRole,
} = require('@prisma/client');
const { ensureSeedAllowed } = require('../scripts/seed-guard');

const DEMO_MARKER = '【课程演示动态】';
const DEMO_USERNAME_PREFIX = 'course_demo_';
const DEMO_PASSWORD = 'CourseDemo123!';
const INITIAL_COIN_BALANCE = 10;
const DEFAULT_MAIN_USERNAME = 'live_user_1';

const isCleanOnly = process.argv.includes('--clean');
const isSyncOnly = process.argv.includes('--sync-only');

const userSelect = {
  id: true,
  username: true,
  nickname: true,
  avatarUrl: true,
};

const avatarSeeds = [
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=320&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=320&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=320&q=80',
  'https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=320&q=80',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=320&q=80',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1c?auto=format&fit=crop&w=320&q=80',
];

function getPostBlueprints(mainUsername) {
  const baseBlueprints = [
    {
      authorUsername: mainUsername,
      content: '今天把动态区的点赞、评论和计数链路又跑了一遍，课堂演示时可以直接从信息流点进评论面板。',
      comments: [
        '这条很适合演示动态区从列表到评论的完整流程。',
        '计数能和评论列表对上，答辩时讲起来会很稳。',
        '建议展示时先刷新动态页，再点开评论面板看明细。',
        '纯文字动态也能把互动链路说明白。',
      ],
    },
    {
      authorUsername: 'course_demo_01',
      content: '课程项目今天重点检查了动态信息流，纯文字内容、关注动态和推荐动态都能一起展示。',
      comments: [
        '关注和推荐放在一起展示，老师会更容易理解信息流来源。',
        '纯文字版本加载快，很适合现场演示。',
        '这个场景可以顺手讲一下分页和排序。',
        '动态区终于不空了，页面观感会自然很多。',
      ],
    },
    {
      authorUsername: 'course_demo_02',
      content: '刚看完创作中心的数据，作品数量、浏览量、点赞和投币这些指标都可以作为演示入口。',
      comments: [
        '从创作中心切到动态区，功能闭环就连起来了。',
        '作品数量那一行现在很直观，适合放在汇报开头。',
        '投币和点赞都能展示，互动数据会更完整。',
        '这条可以配合个人主页一起讲。',
      ],
    },
    {
      authorUsername: 'course_demo_03',
      content: '今天测试了上传后再发布动态的流程，文件上传成功后，动态区也能承接后续互动。',
      comments: [
        '上传成功和动态互动连起来，演示线索很清楚。',
        '这条适合解释为什么要做后台处理和前端提示。',
        '评论区可以补充同学反馈，看起来更真实。',
        '现场如果网络慢，也能先演示已经生成的数据。',
      ],
    },
    {
      authorUsername: 'course_demo_04',
      content: '动态区的评论内容尽量贴合项目主题，这样演示时不是单纯堆数字，而是像真实同学在交流。',
      comments: [
        '同意，评论内容有上下文，页面会可信很多。',
        '这比纯数字更能说明互动功能真的跑通了。',
        '答辩时老师点开评论，也能看到合理内容。',
        '互动数据和文本一起看，完成度更明显。',
      ],
    },
    {
      authorUsername: 'course_demo_05',
      content: '今天把推荐页、动态页和视频详情页串了一遍，准备按“发现内容-互动-回到创作中心”这个顺序讲。',
      comments: [
        '这个演示顺序很顺，从用户视角出发比较好讲。',
        '中间加上点赞评论，系统就不只是静态页面了。',
        '最后回到创作中心看统计，闭环感会很强。',
        '建议把动态区放在第二段展示。',
      ],
    },
    {
      authorUsername: 'course_demo_06',
      content: '直播和动态都属于活跃内容入口，课堂展示时可以先看动态，再切到直播间说明实时能力。',
      comments: [
        '动态负责沉淀内容，直播负责实时互动，两个入口挺互补。',
        '如果时间够，可以把直播消息也一起展示。',
        '这条可以放在演示流程的过渡位置。',
        '老师问扩展性时，这里很好展开。',
      ],
    },
    {
      authorUsername: 'course_demo_07',
      content: '动态区现在更像一个真实社区：有人发状态，有人点赞，有人评论，数据不是孤零零的。',
      comments: [
        '社区感确实出来了，页面不会显得空。',
        '互动数据有明细支撑，讲起来更有底气。',
        '这个描述可以直接放到答辩讲稿里。',
        '多账号参与后，推荐流也更自然。',
      ],
    },
    {
      authorUsername: 'course_demo_08',
      content: '准备答辩时我会重点说明：动态点赞数来自点赞表，评论数来自评论表，不只是前端写死。',
      comments: [
        '这个点很关键，能证明数据不是硬编码。',
        '可以现场开评论面板验证数量。',
        '如果老师问数据库设计，这里正好能讲冗余计数。',
        '计数和明细同步，展示效果会更可信。',
      ],
    },
    {
      authorUsername: 'course_demo_09',
      content: '今天顺手整理了一份演示脚本，先造演示账号，再发纯文字动态，最后补点赞和评论。',
      comments: [
        '脚本化之后重复演示会省很多时间。',
        '保留演示标记也方便后面一键清理。',
        '纯文字动态不用依赖图片资源，稳定性更好。',
        '这个流程适合课前快速重置数据。',
      ],
    },
    {
      authorUsername: 'course_demo_10',
      content: '信息流里如果只有视频会有点单一，加入文字动态之后，页面更像真实的视频社区首页。',
      comments: [
        '文字动态能补足社区氛围，确实有必要。',
        '视频和动态混排，推荐页看起来更丰富。',
        '这条适合演示“动态”筛选标签。',
        '不用图片也能把信息密度撑起来。',
      ],
    },
    {
      authorUsername: 'course_demo_11',
      content: '最后检查了一遍：每条演示动态都有点赞和评论，刷新后计数仍然能对上。',
      comments: [
        '刷新后还对得上，说明后端数据没有漂。',
        '这条可以作为演示前的确认项。',
        '如果现场数据不够，可以直接重新跑脚本。',
        '评论列表和卡片数字一致，看着很舒服。',
      ],
    },
  ];

  return [...buildCategoryPostBlueprints(), ...baseBlueprints];
}

const categoryDynamicGroups = [
  {
    key: 'study',
    label: '学习区',
    topic: '课程复盘、考试准备和答辩讲解',
    comments: [
      '学习区这条很适合展示纯文字动态和评论互动。',
      '知识点写得清楚，课堂演示时一眼能看懂。',
      '考试复盘和课程答辩放在一起讲很自然。',
      '这个内容放在学习分区很贴切。',
    ],
    contents: [
      '学习区打卡：今天整理了课程项目的数据库表关系，重点复盘用户、视频、动态和评论之间的数据流。',
      '知识复盘：把动态页的分页、排序和评论加载流程画成了流程图，答辩时可以直接按步骤讲。',
      '考试周准备：先用 10 分钟演示核心功能，再用 5 分钟讲技术实现，节奏会比较稳。',
      '学习笔记：前端状态、接口返回和数据库计数要一起对齐，不然现场刷新容易露出不一致。',
      '英语展示稿也顺手准备了一版，介绍项目时会从 community feed 和 creator center 两块切入。',
      '课程答辩清单：登录、发动态、点赞评论、进入个人主页、查看创作中心，按这个顺序比较清晰。',
      '知识区补充：冗余计数字段适合高频列表展示，但需要用脚本定期和明细表校准。',
      'study 记录：今天把纯文字动态也纳入分区展示，学习区不再只有视频内容。',
    ],
  },
  {
    key: 'programming',
    label: '编程区',
    topic: '接口联调、类型设计和工程实现',
    comments: [
      '编程区这条能说明前后端接口是打通的。',
      '技术实现讲到这里很顺，可以顺便展示代码结构。',
      'TypeScript 类型和接口返回能对上，这点很加分。',
      '这个 tech 内容适合放到编程分区演示。',
    ],
    contents: [
      '编程区记录：今天把 NestJS 的 feed/sidebar overview 接口接上了，动态页统计终于不再写死。',
      '技术笔记：Prisma 里用 groupBy 和 count 做数据校验，列表展示用冗余字段提升读取效率。',
      'TypeScript 小结：前端类型先定义 DynamicSidebarOverview，再封装 getSidebarOverview，组件只关心展示。',
      'Java 后端同学也能看懂这套结构：controller 负责入口，service 负责聚合统计，脚本负责演示数据。',
      'coding 进度：动态分区现在靠标题和正文关键词匹配，纯文字内容也能进入编程区。',
      '科技区补充：上传、审核、推荐、动态互动这些功能串起来后，项目就更像完整平台。',
      'next step 记录：演示前先跑 seed 脚本，再构建前后端，避免现场数据不够。',
      'tech 复盘：接口返回真实数据后，关注、粉丝和动态数字都能和数据库同步。',
    ],
  },
  {
    key: 'game',
    label: '游戏区',
    topic: '游戏实况、互动评论和内容推荐',
    comments: [
      '游戏区动态也有了，筛选时不会空。',
      '这个实况描述挺适合演示互动评论。',
      'game 内容能让信息流更丰富。',
      '这条放到游戏分区刚好。',
    ],
    contents: [
      '游戏区动态：今天用一段游戏实况作为演示素材，重点看点赞、评论和信息流排序。',
      '实况复盘：如果课堂现场紧张，可以先打开游戏区，纯文字动态加载最快。',
      'game 测试：不同账号围绕同一条游戏内容评论，动态页看起来更像真实社区。',
      '游戏体验笔记：手柄、键盘和触屏的交互差异，也能拿来解释视频平台的用户偏好。',
      '实况剪辑思路：先展示热门内容，再切评论区，最后回到创作中心看统计。',
      '游戏区补位：没有图片也没关系，纯文字状态足够演示分区筛选。',
      'game demo：这里可以模拟同学看完游戏片段后的讨论，突出评论功能。',
      '游戏区准备完毕：刷新后能看到多账号发布的新动态。',
    ],
  },
  {
    key: 'film',
    label: '影视区',
    topic: '影视短评、演示视频和娱乐内容',
    comments: [
      '影视区内容也补上了，页面更均衡。',
      '电影和娱乐关键词能稳定进这个分区。',
      'media 动态适合展示纯文字社区感。',
      '这条放影视分区很自然。',
    ],
    contents: [
      '影视区动态：今天整理了项目演示视频的开场脚本，准备做成一分钟的课堂展示片段。',
      '电影感复盘：动态页如果有影视内容，整体社区氛围会比纯技术内容更丰富。',
      '娱乐区记录：答辩前用轻松一点的动态内容暖场，页面不会显得太硬。',
      'media 测试：纯文字动态也可以承载观后感、短评和推荐理由。',
      '影视笔记：评论区适合展示同学对作品剪辑节奏的反馈。',
      'film demo：这一组动态用来验证影视分区筛选和点赞评论计数。',
      '电影区补充：不用上传图片，也能让信息流有不同主题的内容。',
      '娱乐内容准备好：课堂演示时可以切到影视区看多账号动态。',
    ],
  },
];

function buildCategoryPostBlueprints() {
  const blueprints = [];
  const maxContentCount = Math.max(...categoryDynamicGroups.map((group) => group.contents.length));

  for (let round = 0; round < 2; round += 1) {
    for (let contentIndex = 0; contentIndex < maxContentCount; contentIndex += 1) {
      for (let groupIndex = 0; groupIndex < categoryDynamicGroups.length; groupIndex += 1) {
        const group = categoryDynamicGroups[groupIndex];
        const baseContent = group.contents[contentIndex];
        if (!baseContent) {
          continue;
        }

        const authorIndex = groupIndex * maxContentCount + contentIndex + 1;
        blueprints.push({
          authorUsername: getDemoUsername(authorIndex),
          content:
            round === 0
              ? `${group.label}：${baseContent}`
              : `${group.label}演示补充 ${contentIndex + 1}：继续围绕${group.topic}发布一条纯文字动态，方便课堂现场切换到${group.label}时看到多账号内容。`,
          comments: group.comments,
        });
      }
    }
  }

  return blueprints;
}

function normalizePositiveInteger(value, fallback) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }
  return parsed;
}

function getMainUsername() {
  return process.env.DEMO_DYNAMIC_MAIN_USERNAME || DEFAULT_MAIN_USERNAME;
}

function getDemoUserCount() {
  return Math.max(32, normalizePositiveInteger(process.env.DEMO_DYNAMIC_USER_COUNT, 36));
}

function getDemoPostCount() {
  return normalizePositiveInteger(process.env.DEMO_DYNAMIC_POST_COUNT, 76);
}

function getDemoFollowCount() {
  return Math.max(32, normalizePositiveInteger(process.env.DEMO_DYNAMIC_FOLLOW_COUNT, 32));
}

function minutesAgo(value) {
  return new Date(Date.now() - value * 60 * 1000);
}

function addMinutesClamped(value, minutes) {
  const candidate = new Date(value.getTime() + minutes * 60 * 1000);
  const latest = new Date(Date.now() - 2 * 60 * 1000);
  return candidate > latest ? latest : candidate;
}

function clampIndex(index, length) {
  return ((index % length) + length) % length;
}

function pickRotated(items, start, count) {
  return Array.from({ length: Math.min(count, items.length) }, (_, offset) => {
    return items[clampIndex(start + offset, items.length)];
  });
}

function toNumber(value) {
  return typeof value === 'bigint' ? Number(value) : Number(value ?? 0);
}

function getDemoUsername(index) {
  return `${DEMO_USERNAME_PREFIX}${String(index).padStart(2, '0')}`;
}

async function ensureDemoUsers(prisma) {
  const users = [];
  const demoUserCount = getDemoUserCount();

  for (let index = 1; index <= demoUserCount; index += 1) {
    const username = getDemoUsername(index);
    const existing = await prisma.user.findUnique({
      where: { username },
      select: userSelect,
    });

    if (existing) {
      users.push(existing);
      continue;
    }

    const serial = String(index).padStart(2, '0');
    const created = await prisma.user.create({
      data: {
        username,
        email: `${username}@demo.local.invalid`,
        password: DEMO_PASSWORD,
        role: UserRole.USER,
        nickname: `课程演示测试用户${serial}`,
        avatarUrl: avatarSeeds[clampIndex(index - 1, avatarSeeds.length)],
        bio: '课程项目演示专用测试账号，数据可由脚本一键清理。',
        coinBalance: INITIAL_COIN_BALANCE,
        favoriteFolders: {
          create: {
            name: '课程演示收藏夹',
            isDefault: true,
          },
        },
      },
      select: userSelect,
    });

    users.push(created);
  }

  return users;
}

async function buildActorPool(prisma, mainUsername) {
  const demoUsers = await ensureDemoUsers(prisma);
  const mainUser = await prisma.user.findUnique({
    where: { username: mainUsername },
    select: userSelect,
  });

  const usersById = new Map();
  if (mainUser) {
    usersById.set(mainUser.id, mainUser);
  }
  for (const user of demoUsers) {
    usersById.set(user.id, user);
  }

  return Array.from(usersById.values());
}

async function seedFollowRelations(prisma, mainUsername, actors) {
  const mainUser = actors.find((user) => user.username === mainUsername);
  if (!mainUser) {
    return {
      created: 0,
      target: 0,
      totalFollowing: 0,
    };
  }

  const followTarget = Math.min(getDemoFollowCount(), actors.filter((user) => user.id !== mainUser.id).length);
  const targets = actors.filter((user) => user.id !== mainUser.id).slice(0, followTarget);
  const result = await prisma.followRelation.createMany({
    data: targets.map((user, index) => ({
      followerId: mainUser.id,
      followingId: user.id,
      createdAt: minutesAgo(260 - index * 6),
    })),
    skipDuplicates: true,
  });

  const totalFollowing = await prisma.followRelation.count({
    where: { followerId: mainUser.id },
  });

  return {
    created: result.count,
    target: targets.length,
    totalFollowing,
  };
}

async function cleanDemoDynamics(prisma) {
  const demoPosts = await prisma.dynamicPost.findMany({
    where: {
      content: {
        startsWith: DEMO_MARKER,
      },
    },
    select: {
      id: true,
    },
  });
  const postIds = demoPosts.map((post) => post.id);

  if (postIds.length === 0) {
    return {
      posts: 0,
      likes: 0,
      comments: 0,
      notifications: 0,
    };
  }

  const [deletedNotifications, deletedLikes, deletedComments, deletedPosts] = await prisma.$transaction([
    prisma.notification.deleteMany({
      where: {
        relatedType: 'DYNAMIC_POST',
        relatedId: {
          in: postIds,
        },
      },
    }),
    prisma.dynamicPostLike.deleteMany({
      where: {
        postId: {
          in: postIds,
        },
      },
    }),
    prisma.dynamicPostComment.deleteMany({
      where: {
        postId: {
          in: postIds,
        },
      },
    }),
    prisma.dynamicPost.deleteMany({
      where: {
        id: {
          in: postIds,
        },
      },
    }),
  ]);

  return {
    posts: deletedPosts.count,
    likes: deletedLikes.count,
    comments: deletedComments.count,
    notifications: deletedNotifications.count,
  };
}

async function syncDynamicPostCounters(prisma) {
  const rows = await prisma.$queryRaw`
    SELECT
      p.id,
      p.likeCount,
      COUNT(DISTINCT l.id) AS actualLikeCount,
      p.commentCount,
      COUNT(DISTINCT c.id) AS actualCommentCount,
      p.favoriteCount
    FROM DynamicPost p
    LEFT JOIN DynamicPostLike l ON l.postId = p.id
    LEFT JOIN DynamicPostComment c ON c.postId = p.id AND c.status = 'NORMAL'
    GROUP BY p.id, p.likeCount, p.commentCount, p.favoriteCount
  `;

  let changed = 0;
  for (const row of rows) {
    const likeCount = toNumber(row.actualLikeCount);
    const commentCount = toNumber(row.actualCommentCount);
    const favoriteCount = 0;

    if (
      toNumber(row.likeCount) === likeCount &&
      toNumber(row.commentCount) === commentCount &&
      toNumber(row.favoriteCount) === favoriteCount
    ) {
      continue;
    }

    await prisma.dynamicPost.update({
      where: {
        id: toNumber(row.id),
      },
      data: {
        likeCount,
        commentCount,
        favoriteCount,
      },
    });
    changed += 1;
  }

  return {
    checked: rows.length,
    changed,
  };
}

function resolveAuthor(actorsByUsername, actors, blueprint, index) {
  return actorsByUsername.get(blueprint.authorUsername) ?? actors[clampIndex(index, actors.length)];
}

function buildNotificationTime(baseTime, index) {
  return addMinutesClamped(baseTime, 4 + index * 2);
}

async function seedPost(prisma, actors, blueprint, index) {
  const actorsByUsername = new Map(actors.map((actor) => [actor.username, actor]));
  const author = resolveAuthor(actorsByUsername, actors, blueprint, index);
  const otherActors = actors.filter((actor) => actor.id !== author.id);
  const likeTarget = Math.min(otherActors.length, 6 + (index % 4));
  const commentTarget = Math.min(otherActors.length, 3 + (index % 3));
  const likers = pickRotated(otherActors, index * 3, likeTarget);
  const commenters = pickRotated(otherActors, index * 5 + 2, commentTarget);
  const createdAt = minutesAgo(75 + index * 37);

  return prisma.$transaction(async (tx) => {
    const post = await tx.dynamicPost.create({
      data: {
        authorId: author.id,
        content: `${DEMO_MARKER}${blueprint.content}`,
        imageUrls: [],
        status: TextStatus.NORMAL,
        likeCount: 0,
        commentCount: 0,
        favoriteCount: 0,
        createdAt,
      },
      select: {
        id: true,
      },
    });

    const likeRows = likers.map((user, likerIndex) => ({
      postId: post.id,
      userId: user.id,
      createdAt: addMinutesClamped(createdAt, 6 + likerIndex * 3),
    }));
    if (likeRows.length > 0) {
      await tx.dynamicPostLike.createMany({
        data: likeRows,
        skipDuplicates: true,
      });
    }

    const commentRows = commenters.map((user, commentIndex) => ({
      postId: post.id,
      userId: user.id,
      content: blueprint.comments[commentIndex % blueprint.comments.length],
      status: TextStatus.NORMAL,
      createdAt: addMinutesClamped(createdAt, 14 + commentIndex * 7),
    }));
    if (commentRows.length > 0) {
      await tx.dynamicPostComment.createMany({
        data: commentRows,
      });
    }

    const likeNotifications = likers.map((user, likeIndex) => ({
      recipientId: author.id,
      actorId: user.id,
      type: NotificationType.LIKE,
      title: '收到新的点赞',
      content: `${user.nickname} 点赞了你的动态`,
      relatedType: 'DYNAMIC_POST',
      relatedId: post.id,
      createdAt: buildNotificationTime(createdAt, likeIndex),
    }));
    const commentNotifications = commenters.map((user, commentIndex) => {
      const content = blueprint.comments[commentIndex % blueprint.comments.length];
      return {
        recipientId: author.id,
        actorId: user.id,
        type: NotificationType.COMMENT,
        title: '收到新的评论',
        content: `${user.nickname} 评论了你的动态：${content.slice(0, 80)}`,
        relatedType: 'DYNAMIC_POST',
        relatedId: post.id,
        createdAt: buildNotificationTime(createdAt, likeNotifications.length + commentIndex),
      };
    });

    const notifications = [...likeNotifications, ...commentNotifications];
    if (notifications.length > 0) {
      await tx.notification.createMany({
        data: notifications,
      });
    }

    await tx.dynamicPost.update({
      where: {
        id: post.id,
      },
      data: {
        likeCount: likeRows.length,
        commentCount: commentRows.length,
        favoriteCount: 0,
      },
    });

    return {
      id: post.id,
      author: author.username,
      likes: likeRows.length,
      comments: commentRows.length,
      notifications: notifications.length,
    };
  });
}

async function seedDemoDynamics(prisma) {
  const mainUsername = getMainUsername();
  const actors = await buildActorPool(prisma, mainUsername);
  if (actors.length < 2) {
    throw new Error('At least two users are required to seed dynamic engagement.');
  }

  const followResult = await seedFollowRelations(prisma, mainUsername, actors);
  const postBlueprints = getPostBlueprints(mainUsername);
  const blueprints = postBlueprints.slice(0, Math.min(getDemoPostCount(), postBlueprints.length));
  const createdPosts = [];
  for (let index = 0; index < blueprints.length; index += 1) {
    createdPosts.push(await seedPost(prisma, actors, blueprints[index], index));
  }

  return {
    mainUsername,
    users: actors.length,
    follows: followResult,
    posts: createdPosts.length,
    likes: createdPosts.reduce((sum, post) => sum + post.likes, 0),
    comments: createdPosts.reduce((sum, post) => sum + post.comments, 0),
    notifications: createdPosts.reduce((sum, post) => sum + post.notifications, 0),
  };
}

async function main() {
  await ensureSeedAllowed();
  const prisma = new PrismaClient();

  try {
    if (isSyncOnly) {
      const sync = await syncDynamicPostCounters(prisma);
      console.log('Dynamic post counters synced:', sync);
      return;
    }

    const cleaned = await cleanDemoDynamics(prisma);
    const syncedBeforeSeed = await syncDynamicPostCounters(prisma);

    if (isCleanOnly) {
      console.log('Demo dynamic feed cleaned:', {
        cleaned,
        synced: syncedBeforeSeed,
      });
      return;
    }

    const seeded = await seedDemoDynamics(prisma);
    const syncedAfterSeed = await syncDynamicPostCounters(prisma);

    console.log('Demo dynamic feed seed completed:', {
      marker: DEMO_MARKER,
      cleaned,
      syncedBeforeSeed,
      seeded,
      syncedAfterSeed,
    });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
