const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const { SearchService } = require('../../backend/dist/modules/search/search.service.js');

function createMockFn(impl = async () => undefined) {
  const fn = async (...args) => {
    fn.calls.push(args);
    return impl(...args);
  };
  fn.calls = [];
  return fn;
}

function createSyncMockFn(impl = () => undefined) {
  const fn = (...args) => {
    fn.calls.push(args);
    return impl(...args);
  };
  fn.calls = [];
  return fn;
}

function makeService() {
  const prisma = {
    user: {
      count: createMockFn(async () => 2),
      findMany: createMockFn(async () => [{ id: 1, username: 'alice' }]),
    },
    video: {
      count: createMockFn(async () => 3),
      findMany: createMockFn(async () => [{ title: 'Hot Video' }, { title: 'Hot Video' }, { title: 'Second' }]),
    },
  };
  const videoService = {
    getRecommendFeed: createMockFn(async () => [{ id: 1, title: 'Recommended' }]),
    searchPublishedVideos: createMockFn(async () => [{ id: 2, title: 'Search Result' }]),
  };
  const liveService = {
    listRooms: createSyncMockFn(() => [{ id: 1, title: 'Live Room' }]),
    countRooms: createSyncMockFn(() => 1),
  };
  return { service: new SearchService(prisma, videoService, liveService), prisma, videoService, liveService };
}

describe('SearchService discovery rules', () => {
  it('normalizes page, pageSize, category and delegates video search for video tab', async () => {
    const { service, videoService } = makeService();

    const result = await service.search({
      keyword: '  tech  ',
      tab: 'video',
      categoryCode: 'tech',
      sortBy: 'latest',
      page: 2.8,
      pageSize: 99,
      currentUserId: 7,
    });

    assert.equal(result.keyword, 'tech');
    assert.equal(result.page, 2);
    assert.equal(result.pageSize, 50);
    assert.equal(result.category, 'tech');
    assert.deepEqual(videoService.searchPublishedVideos.calls[0][0], 'tech');
    assert.equal(videoService.searchPublishedVideos.calls[0][1].currentUserId, 7);
  });

  it('searches users only for user tab and live rooms only for live tab', async () => {
    const { service, prisma, liveService, videoService } = makeService();

    const userResult = await service.search({ keyword: 'alice', tab: 'user', page: 1, pageSize: 10 });
    const liveResult = await service.search({ keyword: 'room', tab: 'live', categoryCode: 'live', page: 1, pageSize: 10 });

    assert.deepEqual(userResult.user, [{ id: 1, username: 'alice' }]);
    assert.deepEqual(liveResult.live, [{ id: 1, title: 'Live Room' }]);
    assert.equal(prisma.user.findMany.calls.length, 1);
    assert.equal(liveService.listRooms.calls.length, 1);
    assert.equal(videoService.searchPublishedVideos.calls.length, 0);
  });

  it('builds hot feed, hotwords and suggestions from public content', async () => {
    const { service, prisma, videoService, liveService } = makeService();

    assert.deepEqual(await service.getHotFeed('LIVE'), [{ id: 1, title: 'Live Room' }]);
    assert.deepEqual(await service.getHotFeed('VIDEO'), [{ id: 1, title: 'Recommended' }]);
    assert.equal(liveService.listRooms.calls[0][0].status, 'LIVING');
    assert.equal(videoService.getRecommendFeed.calls[0][0].sortBy, 'hot');

    const hotwords = await service.getHotwords();
    const suggestions = await service.suggest('Hot');

    assert.equal(hotwords.includes('Hot Video'), true);
    assert.equal(new Set(suggestions.list).size, suggestions.list.length);
    assert.equal(prisma.video.findMany.calls.length >= 2, true);
  });

  it('returns empty suggestion list for blank keyword and keeps compact keywords intact', async () => {
    const { service } = makeService();

    assert.deepEqual(await service.suggest('   '), { list: [] });
    assert.equal(service.normalizePage(-1), 1);
    assert.equal(service.normalizePageSize(999), 50);
    assert.deepEqual(service.tokenizeSearchKeyword('abcd'), ['abcd']);
  });
});
