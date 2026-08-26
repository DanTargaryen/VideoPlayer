const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const { BadRequestException } = require('@nestjs/common');

const { FollowService } = require('../../backend/dist/modules/follow/follow.service.js');

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
    followRelation: {
      upsert: createMockFn(async () => undefined),
      deleteMany: createMockFn(async () => ({ count: 1 })),
      findUnique: createMockFn(async () => null),
      count: createMockFn(async () => 4),
      findMany: createMockFn(async () => []),
    },
    notification: { create: createMockFn(async () => undefined) },
    video: { findMany: createMockFn(async () => []) },
    $executeRaw: createMockFn(async () => undefined),
    $queryRaw: createMockFn(async () => []),
  };
}

describe('FollowService', () => {
  it('rejects following yourself', async () => {
    const service = new FollowService(makePrisma());

    await assert.rejects(service.follow(1, { id: 1, nickname: 'Alice' }), (error) => error instanceof BadRequestException);
  });

  it('creates follow relation, notification and follower snapshot', async () => {
    const prisma = makePrisma();
    const service = new FollowService(prisma);

    const result = await service.follow(2, { id: 1, nickname: 'Alice' });

    assert.deepEqual(result, { id: 2, followed: true });
    assert.equal(prisma.followRelation.upsert.calls[0][0].create.followerId, 1);
    assert.equal(prisma.followRelation.upsert.calls[0][0].create.followingId, 2);
    assert.equal(prisma.notification.create.calls[0][0].data.type, 'FOLLOW');
    assert.equal(prisma.$executeRaw.calls.length, 1);
  });

  it('unfollows and detects follow state', async () => {
    const prisma = makePrisma();
    prisma.followRelation.findUnique.setImpl(async () => ({ id: 1 }));
    const service = new FollowService(prisma);

    const result = await service.unfollow(2, { id: 1 });
    assert.deepEqual(result, { id: 2, followed: false });
    assert.equal(await service.isFollowing(2, 1), true);
    assert.equal(await service.isFollowing(2, undefined), false);
  });

  it('formats stat dates and clamps follower trend days', async () => {
    const prisma = makePrisma();
    prisma.$queryRaw.setImpl(async () => [{ statDate: '2026-01-01', followerCount: 8 }]);
    const service = new FollowService(prisma);

    assert.equal(service.formatStatDate(new Date('2026-03-04T00:00:00Z')), '2026-03-04');
    const trend = await service.getCreatorFollowerTrend(2, 0);
    assert.equal(trend.length, 1);
    assert.equal(typeof trend[0].date, 'string');
    assert.equal(typeof trend[0].followerCount, 'number');
  });
});
