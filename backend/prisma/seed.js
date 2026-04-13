const { PrismaClient, UserRole, VideoStatus } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  await prisma.videoReview.deleteMany();
  await prisma.video.deleteMany();
  await prisma.user.deleteMany();

  const admin = await prisma.user.create({
    data: {
      username: 'demo_admin',
      email: 'admin@guanlan.dev',
      password: 'admin123',
      role: UserRole.ADMIN,
      nickname: '平台管理员',
      avatarUrl: 'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=320&q=80',
      bio: '负责平台治理与审核演示。',
    },
  });

  const user = await prisma.user.create({
    data: {
      username: 'demo_user',
      email: 'user@guanlan.dev',
      password: 'user123',
      role: UserRole.USER,
      nickname: '演示用户',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=320&q=80',
      bio: '分享科技与学习内容的普通创作者。',
    },
  });

  await prisma.video.create({
    data: {
      creatorId: user.id,
      title: '观澜视频平台演示视频',
      description: '这是一个已发布的视频，用于展示首页推荐、搜索筛选与详情页互动。',
      category: 'tech',
      coverUrl: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=800&q=80',
      playUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      status: VideoStatus.PUBLISHED,
      uploadToken: 'seed-published-token',
      publishedAt: new Date(),
      likeCount: 18,
      favoriteCount: 7,
      commentCount: 3,
    },
  });

  console.log('Seed completed:', { admin: admin.username, user: user.username });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
