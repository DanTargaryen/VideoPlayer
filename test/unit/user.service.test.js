const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const { BadRequestException, NotFoundException, UnauthorizedException } = require('@nestjs/common');

const { UserService } = require('../../backend/dist/modules/user/user.service.js');

function createMockFn(impl = async () => undefined) {
  const fn = async (...args) => {
    fn.calls.push(args);
    return impl(...args);
  };
  fn.calls = [];
  fn.setImpl = (nextImpl) => {
    impl = nextImpl;
  };
  return fn;
}

function makePrisma() {
  return {
    user: {
      findUnique: createMockFn(async () => null),
      findFirst: createMockFn(async () => null),
      update: createMockFn(async ({ where, data }) => ({ id: where.id, username: 'alice', email: 'alice@example.test', ...data })),
    },
    video: {
      count: createMockFn(async () => 0),
      findMany: createMockFn(async () => []),
    },
    followRelation: {
      count: createMockFn(async () => 0),
    },
    $transaction: createMockFn(async (callback) => callback(makeTransaction())),
  };
}

function makeTransaction() {
  const noop = createMockFn(async () => undefined);
  return {
    video: { findMany: createMockFn(async () => []), deleteMany: noop },
    videoReview: { updateMany: noop, deleteMany: noop },
    reportRecord: { updateMany: noop, deleteMany: noop },
    notification: { updateMany: noop, deleteMany: noop },
    userVideoWatch: { deleteMany: noop },
    directMessage: { deleteMany: noop },
    coinTransaction: { deleteMany: noop, updateMany: noop },
    dailyCoinClaim: { deleteMany: noop },
    videoCoinContribution: { deleteMany: noop },
    userCategoryPreference: { deleteMany: noop },
    userCreatorPreference: { deleteMany: noop },
    userProfileSummary: { deleteMany: noop },
    creatorPlayDaily: { deleteMany: noop },
    videoLike: { deleteMany: noop },
    favorite: { deleteMany: noop },
    favoriteFolder: { deleteMany: noop },
    followRelation: { deleteMany: noop },
    videoDanmaku: { deleteMany: noop },
    comment: { deleteMany: noop },
    videoAsset: { deleteMany: noop },
    user: { delete: noop },
    $executeRaw: noop,
  };
}

function makeFollowService() {
  return {
    getFollowerCount: createMockFn(async () => 3),
    isFollowing: createMockFn(async () => true),
  };
}

describe('UserService homepage', () => {
  it('returns homepage summary, category codes and private coin balance for owner', async () => {
    const prisma = makePrisma();
    prisma.user.findUnique.setImpl(async () => ({
      id: 2,
      nickname: 'Alice',
      avatarUrl: '/avatar.png',
      bio: 'bio',
      messagePrivacy: 'PUBLIC',
      coinBalance: 20,
    }));
    prisma.video.count.setImpl(async () => 2);
    prisma.followRelation.count.setImpl(async () => 5);
    prisma.video.findMany.setImpl(async () => [
      {
        id: 10,
        title: 'Video',
        description: 'desc',
        coverUrl: '/cover.png',
        category: 'tech',
        categories: [{ code: 'tech' }, { code: 'study' }],
        playUrl: '/play.mp4',
        durationSeconds: 30,
        playCount: 100,
        likeCount: 4,
        favoriteCount: 2,
        commentCount: 1,
        coinCount: 3,
        publishedAt: '2026-01-01',
        createdAt: '2026-01-01',
      },
    ]);
    const followService = makeFollowService();
    const service = new UserService(prisma, followService);

    const result = await service.getHomepage(2, 2, { itemLimit: 99 });

    assert.equal(result.coinBalance, 20);
    assert.equal(result.followers, 3);
    assert.equal(result.following, 5);
    assert.equal(result.items[0].creator.nickname, 'Alice');
    assert.deepEqual(result.items[0].categories, ['tech', 'study']);
    assert.equal(prisma.video.findMany.calls[0][0].take, 60);
  });

  it('hides coin balance from other users and falls back to legacy category', async () => {
    const prisma = makePrisma();
    prisma.user.findUnique.setImpl(async () => ({ id: 2, nickname: 'Alice', coinBalance: 20 }));
    prisma.video.findMany.setImpl(async () => [{ id: 11, title: 'Video', category: 'game', categories: [] }]);
    const service = new UserService(prisma, makeFollowService());

    const result = await service.getHomepage(2, 99, { itemLimit: -1 });

    assert.equal(result.coinBalance, undefined);
    assert.deepEqual(result.items[0].categories, ['game']);
    assert.equal(prisma.video.findMany.calls[0][0].take, 12);
  });

  it('throws NotFoundException when homepage user does not exist', async () => {
    const service = new UserService(makePrisma(), makeFollowService());

    await assert.rejects(service.getHomepage(404, 1), (error) => error instanceof NotFoundException);
  });
});

describe('UserService profile and account rules', () => {
  it('updates profile after filtering undefined values', async () => {
    const prisma = makePrisma();
    const service = new UserService(prisma, makeFollowService());

    const result = await service.updateProfile(2, {
      nickname: 'New Alice',
      bio: undefined,
      email: 'new@example.test',
    });

    assert.deepEqual(prisma.user.update.calls[0][0].data, {
      nickname: 'New Alice',
      email: 'new@example.test',
    });
    assert.equal(result.nickname, 'New Alice');
  });

  it('rejects profile update when email is already used', async () => {
    const prisma = makePrisma();
    prisma.user.findFirst.setImpl(async () => ({ id: 9 }));
    const service = new UserService(prisma, makeFollowService());

    await assert.rejects(
      service.updateProfile(2, { email: 'used@example.test' }),
      (error) => error instanceof BadRequestException,
    );
    assert.equal(prisma.user.update.calls.length, 0);
  });

  it('rejects account deletion when password check fails', async () => {
    const prisma = makePrisma();
    prisma.user.findUnique.setImpl(async () => ({ id: 2, password: 'right' }));
    const service = new UserService(prisma, makeFollowService());

    await assert.rejects(service.deleteAccount(2, 'wrong'), (error) => error instanceof UnauthorizedException);
    assert.equal(prisma.$transaction.calls.length, 0);
  });
});
