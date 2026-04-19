const { PrismaClient, UserRole, VideoStatus, ReviewStatus, TextStatus } = require('@prisma/client');

const prisma = new PrismaClient();

const DEFAULT_PLAY_URL = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';

function hoursAgo(value) {
  return new Date(Date.now() - value * 60 * 60 * 1000);
}

async function resetDatabase() {
  await prisma.videoAiSummary.deleteMany();
  await prisma.reportRecord.deleteMany();
  await prisma.videoDanmaku.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.videoLike.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.followRelation.deleteMany();
  await prisma.videoReview.deleteMany();
  await prisma.userVideoWatch.deleteMany();
  await prisma.userCategoryPreference.deleteMany();
  await prisma.userCreatorPreference.deleteMany();
  await prisma.userProfileSummary.deleteMany();
  await prisma.videoAsset.deleteMany();
  await prisma.video.deleteMany();
  await prisma.user.deleteMany();
}

async function createUsers() {
  const users = await Promise.all([
    prisma.user.create({
      data: {
        username: 'demo_admin',
        email: 'admin@guanlan.dev',
        password: 'Admin123456!',
        role: UserRole.ADMIN,
        nickname: '平台管理员',
        avatarUrl: 'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=320&q=80',
        bio: '负责平台治理、审核演示和全站巡检。',
      },
    }),
    prisma.user.create({
      data: {
        username: 'demo_user',
        email: 'user@guanlan.dev',
        password: 'User123456!',
        role: UserRole.USER,
        nickname: '演示用户',
        avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=320&q=80',
        bio: '分享科技与学习内容，也会偶尔记录校园生活。',
      },
    }),
    prisma.user.create({
      data: {
        username: 'tech_ming',
        email: 'ming@guanlan.dev',
        password: 'creator123',
        role: UserRole.USER,
        nickname: '阿明实验室',
        avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=320&q=80',
        bio: '主做后端、工程化和效率工具分享。',
      },
    }),
    prisma.user.create({
      data: {
        username: 'study_xiaoyu',
        email: 'xiaoyu@guanlan.dev',
        password: 'creator123',
        role: UserRole.USER,
        nickname: '小鱼自习室',
        avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=320&q=80',
        bio: '专注课程复盘、笔记整理和考试经验。',
      },
    }),
    prisma.user.create({
      data: {
        username: 'game_omega',
        email: 'omega@guanlan.dev',
        password: 'creator123',
        role: UserRole.USER,
        nickname: '欧米伽打机台',
        avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=320&q=80',
        bio: '游戏实况、整活剪辑和设备评测。',
      },
    }),
    prisma.user.create({
      data: {
        username: 'life_yiyi',
        email: 'yiyi@guanlan.dev',
        password: 'creator123',
        role: UserRole.USER,
        nickname: '依依日常',
        avatarUrl: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=320&q=80',
        bio: '记录校园、旅行和演出现场的轻松瞬间。',
      },
    }),
  ]);

  const [admin, demoUser, techCreator, studyCreator, gameCreator, lifeCreator] = users;

  await prisma.followRelation.createMany({
    data: [
      { followerId: demoUser.id, followingId: techCreator.id },
      { followerId: demoUser.id, followingId: studyCreator.id },
      { followerId: demoUser.id, followingId: lifeCreator.id },
      { followerId: techCreator.id, followingId: lifeCreator.id },
      { followerId: studyCreator.id, followingId: techCreator.id },
    ],
    skipDuplicates: true,
  });

  return { admin, demoUser, techCreator, studyCreator, gameCreator, lifeCreator };
}

async function createVideos(userIndex) {
  const videoSeeds = [
    {
      creatorId: userIndex.demoUser.id,
      title: '观澜视频平台演示视频',
      description: '用于展示首页推荐、搜索筛选、详情页互动和上传链路的综合演示视频。',
      category: 'tech',
      coverUrl: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=800&q=80',
      uploadToken: 'seed-demo-platform-intro',
      status: VideoStatus.PUBLISHED,
      publishedAt: hoursAgo(10),
      likeCount: 18,
      favoriteCount: 7,
      commentCount: 3,
    },
    {
      creatorId: userIndex.techCreator.id,
      title: 'NestJS + Prisma 从零搭一个视频平台后端',
      description: '用最小可运行项目讲清楚模块划分、数据建模、接口设计和开发流程。',
      category: 'tech',
      coverUrl: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=800&q=80',
      uploadToken: 'seed-tech-backend-starter',
      status: VideoStatus.PUBLISHED,
      publishedAt: hoursAgo(18),
      likeCount: 26,
      favoriteCount: 13,
      commentCount: 8,
    },
    {
      creatorId: userIndex.techCreator.id,
      title: 'FFmpeg 自动抽帧封面和转码流程实战',
      description: '演示如何在上传后自动生成封面、转码视频并回写数据库状态。',
      category: 'tech',
      coverUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80',
      uploadToken: 'seed-tech-ffmpeg-pipeline',
      status: VideoStatus.PUBLISHED,
      publishedAt: hoursAgo(32),
      likeCount: 14,
      favoriteCount: 9,
      commentCount: 4,
    },
    {
      creatorId: userIndex.studyCreator.id,
      title: '数据库设计入门：从需求到表结构',
      description: '用课程项目举例，讲解实体拆分、关系设计和常见建模误区。',
      category: 'study',
      coverUrl: 'https://images.unsplash.com/photo-1513258496099-48168024aec0?auto=format&fit=crop&w=800&q=80',
      uploadToken: 'seed-study-db-design',
      status: VideoStatus.PUBLISHED,
      publishedAt: hoursAgo(20),
      likeCount: 22,
      favoriteCount: 16,
      commentCount: 6,
    },
    {
      creatorId: userIndex.studyCreator.id,
      title: '软件工程课程答辩怎么准备',
      description: '从演示结构、时间控制到答辩问答，帮你把课程汇报讲清楚。',
      category: 'study',
      coverUrl: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=800&q=80',
      uploadToken: 'seed-study-defense-guide',
      status: VideoStatus.PUBLISHED,
      publishedAt: hoursAgo(6),
      likeCount: 19,
      favoriteCount: 11,
      commentCount: 5,
    },
    {
      creatorId: userIndex.gameCreator.id,
      title: '三分钟看懂这周最上头的独立游戏',
      description: '节奏快、信息密、带一点整活的游戏速报，适合碎片时间观看。',
      category: 'game',
      coverUrl: 'https://images.unsplash.com/photo-1542751110-97427bbecf20?auto=format&fit=crop&w=800&q=80',
      uploadToken: 'seed-game-weekly-fastlook',
      status: VideoStatus.PUBLISHED,
      publishedAt: hoursAgo(12),
      likeCount: 31,
      favoriteCount: 18,
      commentCount: 10,
    },
    {
      creatorId: userIndex.gameCreator.id,
      title: '手柄、键盘还是摇杆？格斗游戏设备体验分享',
      description: '聊聊不同输入设备的手感差异、延迟体验和适合人群。',
      category: 'game',
      coverUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80',
      uploadToken: 'seed-game-controller-review',
      status: VideoStatus.PUBLISHED,
      publishedAt: hoursAgo(44),
      likeCount: 16,
      favoriteCount: 8,
      commentCount: 3,
    },
    {
      creatorId: userIndex.lifeCreator.id,
      title: '校园音乐节 Vlog：从彩排到压轴曲',
      description: '记录社团演出当天的后台准备、现场观众和最后的返场时刻。',
      category: 'entertainment',
      coverUrl: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=800&q=80',
      uploadToken: 'seed-life-campus-festival',
      status: VideoStatus.PUBLISHED,
      publishedAt: hoursAgo(9),
      likeCount: 28,
      favoriteCount: 15,
      commentCount: 12,
    },
    {
      creatorId: userIndex.lifeCreator.id,
      title: '宿舍改造小记：200 块做出更舒服的桌面',
      description: '不走极客风，分享更适合学生党预算的桌面布置思路。',
      category: 'entertainment',
      coverUrl: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=800&q=80',
      uploadToken: 'seed-life-dorm-makeover',
      status: VideoStatus.PUBLISHED,
      publishedAt: hoursAgo(26),
      likeCount: 17,
      favoriteCount: 12,
      commentCount: 7,
    },
    {
      creatorId: userIndex.admin.id,
      title: '平台审核后台功能演示',
      description: '展示视频审核、文本审核、举报处理和仪表盘等后台核心能力。',
      category: 'tech',
      coverUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80',
      uploadToken: 'seed-admin-review-dashboard',
      status: VideoStatus.PUBLISHED,
      publishedAt: hoursAgo(30),
      likeCount: 11,
      favoriteCount: 6,
      commentCount: 2,
    },
    {
      creatorId: userIndex.demoUser.id,
      title: '直播回放：第一次试播踩坑总结',
      description: '整理了推流、封面、播放地址和录播生成过程中遇到的几个坑。',
      category: 'live',
      coverUrl: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=80',
      uploadToken: 'seed-live-replay-summary',
      status: VideoStatus.PUBLISHED,
      publishedAt: hoursAgo(52),
      likeCount: 9,
      favoriteCount: 4,
      commentCount: 1,
    },
    {
      creatorId: userIndex.demoUser.id,
      title: '待审核：校园创作者功能预告',
      description: '准备提交审核的视频草稿，介绍即将上线的创作者成长体系。',
      category: 'tech',
      coverUrl: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=800&q=80',
      uploadToken: 'seed-pending-creator-preview',
      status: VideoStatus.PENDING_REVIEW,
      publishedAt: null,
      submittedAt: hoursAgo(3),
      likeCount: 0,
      favoriteCount: 0,
      commentCount: 0,
    },
    {
      creatorId: userIndex.gameCreator.id,
      title: '被打回的版本：标题和封面还要再改',
      description: '这是一个被驳回的示例稿件，用于展示创作者后台中的修改重投流程。',
      category: 'game',
      coverUrl: 'https://images.unsplash.com/photo-1511882150382-421056c89033?auto=format&fit=crop&w=800&q=80',
      uploadToken: 'seed-rejected-video-case',
      status: VideoStatus.REJECTED,
      rejectReason: '封面和标题表达不清晰，建议重新整理后提交。',
      publishedAt: null,
      submittedAt: hoursAgo(16),
      likeCount: 0,
      favoriteCount: 0,
      commentCount: 0,
    },
    {
      creatorId: userIndex.studyCreator.id,
      title: '草稿：下周复习计划安排',
      description: '还在整理中的学习规划视频草稿，尚未投稿。',
      category: 'study',
      coverUrl: 'https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=800&q=80',
      uploadToken: 'seed-draft-study-plan',
      status: VideoStatus.DRAFT,
      publishedAt: null,
      likeCount: 0,
      favoriteCount: 0,
      commentCount: 0,
    },
  ];

  const videos = [];
  for (const seed of videoSeeds) {
    const created = await prisma.video.create({
      data: {
        creatorId: seed.creatorId,
        title: seed.title,
        description: seed.description,
        category: seed.category,
        coverUrl: seed.coverUrl,
        playUrl: DEFAULT_PLAY_URL,
        status: seed.status,
        uploadToken: seed.uploadToken,
        rejectReason: seed.rejectReason ?? null,
        submittedAt: seed.submittedAt ?? null,
        publishedAt: seed.publishedAt ?? null,
        likeCount: seed.likeCount,
        favoriteCount: seed.favoriteCount,
        commentCount: seed.commentCount,
      },
    });
    videos.push(created);
  }

  const videoIndex = new Map(videos.map((item) => [item.uploadToken, item]));

  await prisma.videoReview.createMany({
    data: [
      {
        videoId: videoIndex.get('seed-pending-creator-preview').id,
        status: ReviewStatus.PENDING,
      },
      {
        videoId: videoIndex.get('seed-rejected-video-case').id,
        reviewerId: userIndex.admin.id,
        status: ReviewStatus.REJECTED,
        reason: '封面和标题表达不清晰，建议重新整理后提交。',
        reviewedAt: hoursAgo(14),
      },
    ],
  });

  await prisma.comment.createMany({
    data: [
      {
        videoId: videoIndex.get('seed-demo-platform-intro').id,
        userId: userIndex.techCreator.id,
        content: '这个演示视频把整体链路讲得很清楚，适合第一次看项目的人。',
        status: TextStatus.NORMAL,
      },
      {
        videoId: videoIndex.get('seed-demo-platform-intro').id,
        userId: userIndex.lifeCreator.id,
        content: '首页和详情页的交互都挺完整，做答辩展示很合适。',
        status: TextStatus.NORMAL,
      },
      {
        videoId: videoIndex.get('seed-life-campus-festival').id,
        userId: userIndex.demoUser.id,
        content: '这个现场氛围感好强，封面也选得不错。',
        status: TextStatus.NORMAL,
      },
    ],
  });

  return videos;
}

async function main() {
  await resetDatabase();
  const userIndex = await createUsers();
  const videos = await createVideos(userIndex);

  console.log('Seed completed:', {
    users: 6,
    videos: videos.length,
    publishedVideos: videos.filter((item) => item.status === VideoStatus.PUBLISHED).length,
    accounts: {
      admin: 'demo_admin / Admin123456!',
      user: 'demo_user / User123456!',
    },
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
