const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const { NotFoundException } = require('@nestjs/common');

const { VideoService } = require('../../backend/dist/modules/video/video.service.js');

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

function makeService() {
  const prisma = {
    video: { findUnique: createMockFn(async () => null) },
    videoAsset: { findUnique: createMockFn(async () => null) },
    favoriteFolder: {
      findFirst: createMockFn(async () => null),
      update: createMockFn(async ({ where, data }) => ({ id: where.id, ...data })),
      create: createMockFn(async ({ data }) => ({ id: 1, ...data })),
    },
    favorite: { updateMany: createMockFn(async () => ({ count: 0 })) },
  };
  const service = new VideoService(
    prisma,
    {},
    { getProfile: createMockFn(async () => ({ summary: { isColdStart: true } })) },
    { processVideo: createMockFn(async () => undefined) },
    {},
  );
  return { service, prisma };
}

describe('VideoService watch progress rules', () => {
  it('normalizes watch duration and current time safely', () => {
    const { service } = makeService();

    assert.equal(service.resolveWatchDurationSeconds(-1, 10.4, 8.2, Number.NaN), 10);
    assert.equal(service.resolveWatchDurationSeconds(-1, Number.NaN), 0);
    assert.equal(service.normalizeReportedWatchSeconds(-3), 0);
    assert.equal(service.normalizeReportedWatchSeconds(999999), 7200);
    assert.equal(service.normalizeCurrentTimeSeconds(12.6, 10), 10);
    assert.equal(service.normalizeCurrentTimeSeconds(12.6, 0), 13);
  });

  it('calculates watch ratio and completion increment decisions', () => {
    const { service } = makeService();

    assert.equal(service.calculateWatchRatio(80, 100), 0.8);
    assert.equal(service.calculateWatchRatio(150, 100), 1);
    assert.equal(service.calculateWatchRatio(10, 0), 0);
    assert.equal(service.shouldIncrementCompleted(0.2, 0.95, 'progress'), true);
    assert.equal(service.shouldIncrementCompleted(0.95, 0.95, 'progress'), false);
    assert.equal(service.shouldIncrementCompleted(0.95, 0.95, 'ended'), true);
    assert.equal(service.shouldIncrementCompleted(0.1, 0.5, 'ended'), false);
  });
});

describe('VideoService category, paging and file-name rules', () => {
  it('normalizes categories with dedupe, fallback and default category', () => {
    const { service } = makeService();

    assert.deepEqual(service.normalizeVideoCategoryCodes(['tech', 'bad', 'tech', 'study'], 'game'), ['tech', 'study']);
    assert.deepEqual(service.normalizeVideoCategoryCodes([], 'game'), ['game']);
    assert.deepEqual(service.normalizeVideoCategoryCodes(['bad'], 'bad'), ['entertainment']);
    assert.deepEqual(service.resolvePayloadCategoryUpdate({}, 'tech'), null);
    assert.deepEqual(service.resolvePayloadCategoryUpdate({ category: 'game' }, 'tech'), ['game']);
  });

  it('builds category filters and order rules', () => {
    const { service } = makeService();

    assert.deepEqual(service.buildOptionalCategoryWhere(undefined), {});
    assert.deepEqual(service.buildCategoryWhere(['tech', 'study']).OR[0], { category: { in: ['tech', 'study'] } });
    assert.deepEqual(service.buildVideoOrderBy('latest'), [{ publishedAt: 'desc' }, { id: 'desc' }]);
    assert.equal(service.buildVideoOrderBy('hot')[0].likeCount, 'desc');
  });

  it('normalizes page values and storage file names', () => {
    const { service } = makeService();

    assert.equal(service.normalizePage(-1), 1);
    assert.equal(service.normalizePage(2.8), 2);
    assert.equal(service.normalizePageSize(999), 50);
    assert.match(service.buildStorageFileName('My Video!.MP4'), /^\d+-my-video\.mp4$/);
    assert.match(service.buildStorageFileName('视频'), /^\d+-upload$/);
  });
});

describe('VideoService recommendation and search scoring helpers', () => {
  it('scores newer and more interactive videos higher', () => {
    const { service } = makeService();
    const now = new Date('2026-01-02T00:00:00Z');

    const high = service.calculateRecommendScore({
      likeCount: 10,
      favoriteCount: 5,
      commentCount: 3,
      publishedAt: new Date('2026-01-01T23:00:00Z'),
    }, now);
    const low = service.calculateRecommendScore({
      likeCount: 0,
      favoriteCount: 0,
      commentCount: 0,
      publishedAt: new Date('2025-01-01T00:00:00Z'),
    }, now);

    assert.equal(high > low, true);
  });

  it('tokenizes search keywords and ranks exact title matches higher', () => {
    const { service } = makeService();
    const now = new Date('2026-01-01T00:00:00Z');
    const exact = {
      id: 1,
      title: 'javascript',
      description: 'learn code',
      creator: { nickname: 'Teacher' },
      categories: [{ code: 'tech' }],
      likeCount: 0,
      favoriteCount: 0,
      commentCount: 0,
      creatorId: 1,
      publishedAt: now,
    };
    const partial = { ...exact, id: 2, title: 'other', description: 'javascript tips' };

    assert.deepEqual(service.tokenizeSearchKeyword('hello world'), ['hello', 'world']);
    assert.deepEqual(service.tokenizeSearchKeyword('abcd'), ['abcd', 'ab', 'bc', 'cd']);
    assert.equal(
      service.calculateSearchRankingScore(exact, 'javascript', ['javascript'], now, undefined) >
        service.calculateSearchRankingScore(partial, 'javascript', ['javascript'], now, undefined),
      true,
    );
  });

  it('requires published videos and resolves uploaded assets', async () => {
    const { service, prisma } = makeService();
    prisma.video.findUnique.setImpl(async () => ({ id: 1, status: 'DRAFT' }));

    await assert.rejects(service.requirePublishedVideo(1), (error) => error instanceof NotFoundException);

    prisma.videoAsset.findUnique.setImpl(async ({ where }) => ({ id: where.id ?? 99, objectKey: where.objectKey ?? 'token' }));
    assert.deepEqual(await service.resolveAsset(5, undefined), { id: 5, objectKey: 'token' });
    assert.deepEqual(await service.resolveAsset(undefined, 'upload-token'), { id: 99, objectKey: 'upload-token' });
    assert.equal(await service.resolveAsset(undefined, undefined, 'optional'), null);
  });
});
