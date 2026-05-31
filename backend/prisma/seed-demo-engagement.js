const {
  PrismaClient,
  TextStatus,
  UserRole,
  VideoStatus,
} = require('@prisma/client');
const { ensureSeedAllowed } = require('../scripts/seed-guard');

const prisma = new PrismaClient();

const TARGET_IDENTIFIER =
  process.env.DEMO_ENGAGEMENT_TARGET_IDENTIFIER ||
  process.env.DEMO_ENGAGEMENT_TARGET_USERNAME ||
  'mumuxunzi';
const VIDEO_LIMIT = normalizePositiveInteger(process.env.DEMO_ENGAGEMENT_VIDEO_LIMIT, 13);
const DEMO_USER_COUNT = normalizePositiveInteger(process.env.DEMO_ENGAGEMENT_USER_COUNT, 18);
const TREND_DAYS = 7;
const DEMO_USERNAME_PREFIX = 'course_demo_';
const DEMO_MARKER = '【课程演示测试】';
const DEMO_PASSWORD = 'CourseDemo123!';
const INITIAL_COIN_BALANCE = 10;
const isCleanOnly = process.argv.includes('--clean');

const avatarSeeds = [
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=320&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=320&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=320&q=80',
  'https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=320&q=80',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=320&q=80',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=320&q=80',
];

const directMessageSeeds = [
  '课程展示时这个主页数据很直观，老师应该能一眼看懂互动链路。',
  '刚看完你的视频列表，上传、评论和收藏这些功能都能串起来展示。',
  '这个项目如果答辩时从视频详情页讲起，会比较容易说明功能闭环。',
  '测试私信功能：我这边可以正常看到消息入口和会话列表。',
  '演示账号来打个招呼，顺便验证关注后的私信场景。',
  '视频内容和交互数据都准备好了，课程汇报会更完整。',
  '建议答辩时先展示推荐页，再进入个人主页看创作数据。',
  '这里是课程演示测试私信，用来确认未读消息和会话排序。',
];

function normalizePositiveInteger(value, fallback) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }
  return parsed;
}

function minutesAgo(value) {
  return new Date(Date.now() - value * 60 * 1000);
}

function clampIndex(index, length) {
  return ((index % length) + length) % length;
}

function pickRotated(items, start, count) {
  return Array.from({ length: Math.min(count, items.length) }, (_, offset) => {
    return items[clampIndex(start + offset, items.length)];
  });
}

function formatStatDate(value) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getRecentStatDates(days = TREND_DAYS) {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (days - 1 - index));
    return formatStatDate(date);
  });
}

function buildWeightedSeries(total, days = TREND_DAYS) {
  const safeTotal = Math.max(0, Math.floor(total));
  if (days <= 1) {
    return [safeTotal];
  }

  const weights = Array.from({ length: days }, (_, index) => 1 + index * 0.12);
  const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);
  const rawValues = weights.map((weight) => (safeTotal * weight) / weightTotal);
  const values = rawValues.map((value) => Math.floor(value));
  let remainder = safeTotal - values.reduce((sum, value) => sum + value, 0);

  const fractionalOrder = rawValues
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((left, right) => right.fraction - left.fraction);

  let cursor = 0;
  while (remainder > 0 && fractionalOrder.length > 0) {
    values[fractionalOrder[cursor % fractionalOrder.length].index] += 1;
    remainder -= 1;
    cursor += 1;
  }

  return values;
}

function buildFollowerSeries(startValue, endValue, days = TREND_DAYS) {
  const safeStart = Math.max(0, Math.floor(startValue));
  const safeEnd = Math.max(safeStart, Math.floor(endValue));

  if (days <= 1) {
    return [safeEnd];
  }

  return Array.from({ length: days }, (_, index) => {
    if (index === days - 1) {
      return safeEnd;
    }

    const ratio = index / (days - 1);
    return Math.max(0, Math.round(safeStart + (safeEnd - safeStart) * ratio));
  });
}

async function findTargetUser() {
  const select = {
    id: true,
    username: true,
    nickname: true,
  };

  let target = await prisma.user.findUnique({
    where: {
      username: TARGET_IDENTIFIER,
    },
    select,
  });

  if (!target) {
    target = await prisma.user.findFirst({
      where: {
        nickname: TARGET_IDENTIFIER,
      },
      select,
    });
  }

  if (!target) {
    const matches = await prisma.user.findMany({
      where: {
        OR: [
          {
            username: {
              contains: TARGET_IDENTIFIER,
            },
          },
          {
            nickname: {
              contains: TARGET_IDENTIFIER,
            },
          },
        ],
      },
      select,
      take: 5,
      orderBy: [{ id: 'asc' }],
    });

    const hint =
      matches.length > 0
        ? ` 近似匹配：${matches
            .map((item) => `${item.username} / ${item.nickname}`)
            .join('，')}`
        : '';
    throw new Error(`Target user "${TARGET_IDENTIFIER}" was not found by username or nickname.${hint}`);
  }

  return target;
}

async function findTargetVideos(targetUserId) {
  const videos = await prisma.video.findMany({
    where: {
      creatorId: targetUserId,
      status: VideoStatus.PUBLISHED,
    },
    orderBy: [
      { publishedAt: 'desc' },
      { createdAt: 'desc' },
    ],
    take: VIDEO_LIMIT,
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      durationSeconds: true,
      playCount: true,
      likeCount: true,
      favoriteCount: true,
      commentCount: true,
    },
  });

  if (videos.length === 0) {
    throw new Error(`No published videos found for "${TARGET_IDENTIFIER}".`);
  }

  return videos;
}

async function findDemoUsers() {
  return prisma.user.findMany({
    where: {
      username: {
        startsWith: DEMO_USERNAME_PREFIX,
      },
    },
    select: {
      id: true,
      username: true,
    },
  });
}

async function countGrouped(model, where, countField = '_all') {
  const rows = await model.groupBy({
    by: ['videoId'],
    where,
    _count: {
      [countField]: true,
    },
  });

  return new Map(rows.map((item) => [item.videoId, item._count[countField]]));
}

async function sumWatchPlaysByVideo(userIds, videoIds) {
  const rows = await prisma.userVideoWatch.groupBy({
    by: ['videoId'],
    where: {
      userId: { in: userIds },
      videoId: { in: videoIds },
    },
    _sum: {
      playCount: true,
    },
  });

  return new Map(rows.map((item) => [item.videoId, item._sum.playCount || 0]));
}

async function decrementVideoCounters(videos, deltasByVideo) {
  for (const video of videos) {
    const playDelta = deltasByVideo.plays.get(video.id) || 0;
    const likeDelta = deltasByVideo.likes.get(video.id) || 0;
    const favoriteDelta = deltasByVideo.favorites.get(video.id) || 0;
    const commentDelta = deltasByVideo.comments.get(video.id) || 0;

    if (!playDelta && !likeDelta && !favoriteDelta && !commentDelta) {
      continue;
    }

    await prisma.video.update({
      where: { id: video.id },
      data: {
        playCount: Math.max(0, video.playCount - playDelta),
        likeCount: Math.max(0, video.likeCount - likeDelta),
        favoriteCount: Math.max(0, video.favoriteCount - favoriteDelta),
        commentCount: Math.max(0, video.commentCount - commentDelta),
      },
    });
  }
}

async function seedCreatorTrendSnapshots(targetId, totalPlays, followerCount) {
  const statDates = getRecentStatDates();
  const playSeries = buildWeightedSeries(totalPlays, statDates.length);
  const followerSeries = buildFollowerSeries(
    Math.max(0, followerCount - Math.max(6, DEMO_USER_COUNT)),
    followerCount,
    statDates.length,
  );

  for (let index = 0; index < statDates.length; index += 1) {
    const statDate = statDates[index];
    const playCount = playSeries[index] ?? 0;
    const snapshotFollowerCount = followerSeries[index] ?? followerCount;

    await prisma.creatorPlayDaily.upsert({
      where: {
        creatorId_statDate: {
          creatorId: targetId,
          statDate,
        },
      },
      create: {
        creatorId: targetId,
        statDate,
        playCount,
      },
      update: {
        playCount,
      },
    });

    await prisma.creatorFollowerDaily.upsert({
      where: {
        creatorId_statDate: {
          creatorId: targetId,
          statDate,
        },
      },
      create: {
        creatorId: targetId,
        statDate,
        followerCount: snapshotFollowerCount,
      },
      update: {
        followerCount: snapshotFollowerCount,
      },
    });
  }

  return {
    statDates,
    playSeries,
    followerSeries,
  };
}

async function cleanDemoEngagement(target, videos) {
  const demoUsers = await findDemoUsers();
  const demoUserIds = demoUsers.map((item) => item.id);
  const videoIds = videos.map((item) => item.id);
  const recentStatDates = getRecentStatDates();

  if (demoUserIds.length === 0) {
    await prisma.creatorPlayDaily.deleteMany({
      where: {
        creatorId: target.id,
        statDate: { in: recentStatDates },
      },
    });
    await prisma.creatorFollowerDaily.deleteMany({
      where: {
        creatorId: target.id,
        statDate: { in: recentStatDates },
      },
    });
    return { deletedUsers: 0 };
  }

  const deltasByVideo = {
    plays: await sumWatchPlaysByVideo(demoUserIds, videoIds),
    likes: await countGrouped(prisma.videoLike, {
      userId: { in: demoUserIds },
      videoId: { in: videoIds },
    }, 'id'),
    favorites: await countGrouped(prisma.favorite, {
      userId: { in: demoUserIds },
      videoId: { in: videoIds },
    }, 'id'),
    comments: await countGrouped(prisma.comment, {
      userId: { in: demoUserIds },
      videoId: { in: videoIds },
    }, 'id'),
  };

  await prisma.commentAiTask.deleteMany({
    where: {
      requesterId: { in: demoUserIds },
      videoId: { in: videoIds },
    },
  });
  await prisma.videoDanmaku.deleteMany({
    where: {
      userId: { in: demoUserIds },
      videoId: { in: videoIds },
    },
  });
  await prisma.comment.deleteMany({
    where: {
      userId: { in: demoUserIds },
      videoId: { in: videoIds },
    },
  });
  await prisma.favorite.deleteMany({
    where: {
      userId: { in: demoUserIds },
      videoId: { in: videoIds },
    },
  });
  await prisma.videoLike.deleteMany({
    where: {
      userId: { in: demoUserIds },
      videoId: { in: videoIds },
    },
  });
  await prisma.userVideoWatch.deleteMany({
    where: {
      userId: { in: demoUserIds },
      videoId: { in: videoIds },
    },
  });
  await prisma.notification.deleteMany({
    where: {
      OR: [
        { actorId: { in: demoUserIds }, recipientId: target.id },
        { recipientId: { in: demoUserIds } },
      ],
    },
  });
  await prisma.reportRecord.deleteMany({
    where: {
      OR: [
        { reporterId: { in: demoUserIds } },
        { handlerId: { in: demoUserIds } },
      ],
    },
  });
  await prisma.videoCoinContribution.deleteMany({
    where: {
      userId: { in: demoUserIds },
    },
  });
  await prisma.dynamicPost.deleteMany({
    where: {
      authorId: { in: demoUserIds },
    },
  });
  await prisma.creatorPlayDaily.deleteMany({
    where: {
      creatorId: target.id,
      statDate: { in: recentStatDates },
    },
  });
  await prisma.creatorFollowerDaily.deleteMany({
    where: {
      creatorId: target.id,
      statDate: { in: recentStatDates },
    },
  });
  await prisma.directMessage.deleteMany({
    where: {
      OR: [
        { senderId: { in: demoUserIds } },
        { recipientId: { in: demoUserIds } },
      ],
    },
  });
  await prisma.followRelation.deleteMany({
    where: {
      OR: [
        { followerId: { in: demoUserIds } },
        { followingId: { in: demoUserIds } },
      ],
    },
  });
  await prisma.favoriteFolder.deleteMany({
    where: {
      userId: { in: demoUserIds },
    },
  });
  await prisma.userProfileSummary.deleteMany({
    where: {
      userId: { in: demoUserIds },
    },
  });
  await prisma.userCategoryPreference.deleteMany({
    where: {
      userId: { in: demoUserIds },
    },
  });
  await prisma.userCreatorPreference.deleteMany({
    where: {
      OR: [
        { userId: { in: demoUserIds } },
        { creatorId: { in: demoUserIds } },
      ],
    },
  });
  await prisma.coinTransaction.deleteMany({
    where: {
      userId: { in: demoUserIds },
    },
  });
  await prisma.dailyCoinClaim.deleteMany({
    where: {
      userId: { in: demoUserIds },
    },
  });
  await prisma.streakMilestoneClaim.deleteMany({
    where: {
      userId: { in: demoUserIds },
    },
  });
  await prisma.user.deleteMany({
    where: {
      id: { in: demoUserIds },
    },
  });

  await decrementVideoCounters(videos, deltasByVideo);

  return { deletedUsers: demoUserIds.length };
}

async function createDemoUsers() {
  const users = [];

  for (let index = 1; index <= DEMO_USER_COUNT; index += 1) {
    const serial = String(index).padStart(2, '0');
    const username = `${DEMO_USERNAME_PREFIX}${serial}`;
    const user = await prisma.user.create({
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
      include: {
        favoriteFolders: true,
      },
    });
    users.push(user);
  }

  return users;
}

function resolveTopic(video) {
  const text = `${video.title} ${video.description || ''} ${video.category}`.toLowerCase();

  if (video.category === 'game' || /游戏|手柄|键盘|摇杆|独立/.test(text)) {
    return {
      commentSeeds: [
        '节奏剪得很顺，适合答辩时展示视频播放和互动区。',
        '设备体验这段讲得很具体，弹幕一起看会更有现场感。',
        '这个游戏片段很适合拿来演示点赞收藏和评论排序。',
        '内容不拖沓，三分钟内信息量挺足。',
        '如果展示推荐页，这条游戏内容很容易吸引注意力。',
      ],
      danmakuSeeds: ['这段操作很顺', '节奏起来了', '适合展示弹幕', '这里可以暂停讲一下', '手感对比挺明显'],
    };
  }

  if (video.category === 'study' || /数据库|课程|答辩|复习|学习|软件工程/.test(text)) {
    return {
      commentSeeds: [
        '课程项目讲得很清楚，可以直接作为答辩展示素材。',
        '这个结构很适合老师看功能闭环，从需求到实现都能对应上。',
        '表结构和业务功能结合得不错，收藏起来复习。',
        '如果答辩时按这个顺序讲，时间会比较好控制。',
        '这里的例子很贴近课程作业，理解成本低。',
      ],
      danmakuSeeds: ['这里适合答辩讲', '表结构清楚', '收藏复习', '这个例子好懂', '课程项目感很强'],
    };
  }

  if (video.category === 'tech' || /后端|prisma|nestjs|ffmpeg|上传|转码|平台|接口/.test(text)) {
    return {
      commentSeeds: [
        '后端链路讲得很完整，上传到处理这段很适合展示。',
        'Prisma 和接口设计部分比较清楚，功能闭环能看出来。',
        '这条视频拿来演示浏览量、点赞和收藏都很自然。',
        '自动处理媒体的思路不错，课程项目里很加分。',
        '这个功能点和个人主页数据联动起来很直观。',
      ],
      danmakuSeeds: ['接口链路清楚', '这里是重点', '上传流程打通了', '转码处理很实用', '适合放答辩'],
    };
  }

  if (video.category === 'live' || /直播|试播|推流|录播/.test(text)) {
    return {
      commentSeeds: [
        '直播回放这块很适合展示录播保存成稿件的流程。',
        '推流和播放地址这些坑总结得挺实用。',
        '用这条来演示私信和关注后的互动也很合适。',
        '录播生成逻辑讲清楚了，项目完整度会更高。',
        '这段内容适合放在答辩的扩展功能部分。',
      ],
      danmakuSeeds: ['直播链路可以', '录播功能实用', '这里有展示点', '推流坑点真实', '回放保存不错'],
    };
  }

  return {
    commentSeeds: [
      '内容氛围很好，适合展示视频详情页的互动效果。',
      '封面和标题都比较直观，点进来之后信息也清楚。',
      '这条视频可以放在首页演示推荐卡片数据。',
      '评论区和弹幕配合起来，展示效果会更自然。',
      '收藏一下，后面课程展示时可以作为样例视频。',
    ],
    danmakuSeeds: ['氛围不错', '这里很好看', '适合展示', '封面选得好', '这个片段自然'],
  };
}

function buildComment(video, videoIndex, commentIndex) {
  const topic = resolveTopic(video);
  const base = topic.commentSeeds[clampIndex(videoIndex + commentIndex, topic.commentSeeds.length)];
  return `${DEMO_MARKER}${base}`;
}

function buildDanmaku(video, videoIndex, danmakuIndex) {
  const topic = resolveTopic(video);
  const base = topic.danmakuSeeds[clampIndex(videoIndex * 2 + danmakuIndex, topic.danmakuSeeds.length)];
  return `${DEMO_MARKER}${base}`;
}

async function seedRelationships(target, demoUsers) {
  await prisma.followRelation.createMany({
    data: demoUsers.map((user) => ({
      followerId: user.id,
      followingId: target.id,
    })),
    skipDuplicates: true,
  });

  await prisma.directMessage.createMany({
    data: demoUsers.slice(0, Math.min(8, demoUsers.length)).map((user, index) => ({
      senderId: user.id,
      recipientId: target.id,
      content: `${DEMO_MARKER}${directMessageSeeds[index]}`,
      isRead: false,
      createdAt: minutesAgo(80 - index * 7),
    })),
  });
}

async function seedVideoEngagement(videos, demoUsers) {
  const totals = {
    plays: 0,
    likes: 0,
    favorites: 0,
    comments: 0,
    danmakus: 0,
  };

  for (const [videoIndex, video] of videos.entries()) {
    const durationSeconds = video.durationSeconds > 0 ? video.durationSeconds : 120;
    const likeTarget = Math.min(10 + (videoIndex % 5), demoUsers.length);
    const favoriteTarget = Math.min(5 + (videoIndex % 4), demoUsers.length);
    const commentTarget = Math.min(4 + (videoIndex % 3), demoUsers.length);
    const danmakuTarget = Math.min(5 + (videoIndex % 4), demoUsers.length);
    const likeUsers = pickRotated(demoUsers, videoIndex, likeTarget);
    const favoriteUsers = pickRotated(demoUsers, videoIndex + 4, favoriteTarget);
    const commentUsers = pickRotated(demoUsers, videoIndex + 8, commentTarget);
    const danmakuUsers = pickRotated(demoUsers, videoIndex + 12, danmakuTarget);
    let playDelta = 0;

    await prisma.userVideoWatch.createMany({
      data: demoUsers.map((user, userIndex) => {
        const playCount = 1 + ((videoIndex + userIndex) % 3);
        const watchRatio = 0.35 + ((videoIndex + userIndex) % 6) * 0.1;
        const boundedRatio = Math.min(0.95, watchRatio);
        const lastWatchDurationSeconds = Math.max(10, Math.round(durationSeconds * boundedRatio));
        playDelta += playCount;
        return {
          userId: user.id,
          videoId: video.id,
          playCount,
          totalWatchDurationSeconds: lastWatchDurationSeconds * playCount,
          lastWatchDurationSeconds,
          videoDurationSeconds: durationSeconds,
          maxWatchRatio: boundedRatio,
          lastWatchRatio: boundedRatio,
          completedCount: boundedRatio >= 0.8 ? 1 : 0,
          lastWatchedAt: minutesAgo(20 + videoIndex * 9 + userIndex),
        };
      }),
      skipDuplicates: true,
    });

    await prisma.videoLike.createMany({
      data: likeUsers.map((user) => ({
        userId: user.id,
        videoId: video.id,
      })),
      skipDuplicates: true,
    });

    await prisma.favorite.createMany({
      data: favoriteUsers.map((user) => ({
        userId: user.id,
        videoId: video.id,
        folderId: user.favoriteFolders[0]?.id,
      })),
      skipDuplicates: true,
    });

    await prisma.comment.createMany({
      data: commentUsers.map((user, commentIndex) => ({
        userId: user.id,
        videoId: video.id,
        content: buildComment(video, videoIndex, commentIndex),
        status: TextStatus.NORMAL,
        createdAt: minutesAgo(12 + videoIndex * 6 + commentIndex),
      })),
    });

    await prisma.videoDanmaku.createMany({
      data: danmakuUsers.map((user, danmakuIndex) => ({
        userId: user.id,
        videoId: video.id,
        content: buildDanmaku(video, videoIndex, danmakuIndex),
        color: ['#FFFFFF', '#E0F2FE', '#DCFCE7', '#FEF3C7'][clampIndex(videoIndex + danmakuIndex, 4)],
        timeOffsetMs: 3000 + danmakuIndex * 8500 + videoIndex * 500,
        status: TextStatus.NORMAL,
        createdAt: minutesAgo(10 + videoIndex * 5 + danmakuIndex),
      })),
    });

    await prisma.video.update({
      where: { id: video.id },
      data: {
        playCount: { increment: playDelta },
        likeCount: { increment: likeUsers.length },
        favoriteCount: { increment: favoriteUsers.length },
        commentCount: { increment: commentUsers.length },
      },
    });

    totals.plays += playDelta;
    totals.likes += likeUsers.length;
    totals.favorites += favoriteUsers.length;
    totals.comments += commentUsers.length;
    totals.danmakus += danmakuUsers.length;
  }

  return totals;
}

async function main() {
  await ensureSeedAllowed();
  const target = await findTargetUser();
  const videos = await findTargetVideos(target.id);
  const cleanResult = await cleanDemoEngagement(target, videos);

  if (isCleanOnly) {
    console.log('Demo engagement cleanup completed:', {
      target: target.username,
      videos: videos.length,
      deletedDemoUsers: cleanResult.deletedUsers,
    });
    return;
  }

  const demoUsers = await createDemoUsers();
  await seedRelationships(target, demoUsers);
  const engagementTotals = await seedVideoEngagement(videos, demoUsers);
  const followerCount = await prisma.followRelation.count({
    where: {
      followingId: target.id,
    },
  });
  const trendSnapshots = await seedCreatorTrendSnapshots(target.id, engagementTotals.plays, followerCount);

  console.log('Demo engagement seed completed:', {
    target: target.username,
    videos: videos.length,
    demoUsers: demoUsers.length,
    followedTarget: demoUsers.length,
    directMessages: Math.min(8, demoUsers.length),
    playTrendDays: trendSnapshots.statDates.length,
    playTrendTotal: trendSnapshots.playSeries.reduce((sum, value) => sum + value, 0),
    followerTrendCurrent: trendSnapshots.followerSeries[trendSnapshots.followerSeries.length - 1] ?? followerCount,
    ...engagementTotals,
    demoAccountPattern: `${DEMO_USERNAME_PREFIX}01 ...`,
    demoPassword: DEMO_PASSWORD,
    marker: DEMO_MARKER,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
