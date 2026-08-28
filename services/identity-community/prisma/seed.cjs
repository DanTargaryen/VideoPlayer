const fs = require('node:fs');
const path = require('node:path');

const { PrismaClient } = require('@prisma/client');

const { ensureSeedAllowed } = require('../../../backend/scripts/seed-guard');

const prisma = new PrismaClient();
const fixturePath = path.join(__dirname, 'seed.fixture.json');

function loadFixture() {
  const raw = fs.readFileSync(fixturePath, 'utf8');
  return JSON.parse(raw);
}

async function resetTables() {
  await prisma.$transaction([
    prisma.dynamicPostComment.deleteMany(),
    prisma.dynamicPostLike.deleteMany(),
    prisma.dynamicPost.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.directMessage.deleteMany(),
    prisma.followRelation.deleteMany(),
    prisma.userProfileSummary.deleteMany(),
    prisma.userCreatorPreference.deleteMany(),
    prisma.userCategoryPreference.deleteMany(),
    prisma.creatorFollowerDaily.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

async function seedUsers(users) {
  for (const user of users) {
    await prisma.user.create({
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        password: user.password,
        role: user.role,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl ?? null,
        bio: user.bio ?? null,
        messagePrivacy: user.messagePrivacy ?? 'ALLOW_ALL',
      },
    });
    await prisma.userProfileSummary.create({
      data: {
        userId: user.id,
      },
    });
  }
}

async function seedRelations(followRelations) {
  if (!followRelations.length) {
    return;
  }
  await prisma.followRelation.createMany({
    data: followRelations,
    skipDuplicates: true,
  });
}

async function seedNotifications(items) {
  if (!items.length) {
    return;
  }
  await prisma.notification.createMany({
    data: items.map((item) => ({
      recipientId: item.recipientId,
      actorId: item.actorId ?? null,
      type: item.type,
      title: item.title,
      content: item.content,
      relatedType: item.relatedType ?? null,
      relatedId: item.relatedId ?? null,
    })),
  });
}

async function seedDirectMessages(items) {
  if (!items.length) {
    return;
  }
  await prisma.directMessage.createMany({
    data: items.map((item) => ({
      senderId: item.senderId,
      recipientId: item.recipientId,
      content: item.content,
    })),
  });
}

async function seedDynamicPosts(items) {
  if (!items.length) {
    return;
  }
  await prisma.dynamicPost.createMany({
    data: items.map((item) => ({
      authorId: item.authorId,
      content: item.content,
      imageUrls: item.images ?? [],
    })),
  });
}

async function main() {
  await ensureSeedAllowed();
  const fixture = loadFixture();

  await resetTables();
  await seedUsers(fixture.users ?? []);
  await seedRelations(fixture.followRelations ?? []);
  await seedNotifications(fixture.notifications ?? []);
  await seedDirectMessages(fixture.directMessages ?? []);
  await seedDynamicPosts(fixture.dynamicPosts ?? []);

  console.log(`[identity-community seed] loaded ${fixture.users?.length ?? 0} users from fixture`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
