const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const { FeedService } = require('../../backend/dist/modules/feed/feed.service.js');

function makeService() {
  const prisma = {
    video: { findMany: async () => [] },
    user: { findMany: async () => [] },
    videoLike: { findMany: async () => [] },
    favorite: { findMany: async () => [] },
  };
  return new FeedService(prisma, { getRecommendFeed: async () => [] }, { listRooms: () => [] }, {});
}

describe('FeedService normalization and filtering', () => {
  it('normalizes type, page, page size and author id', () => {
    const service = makeService();

    assert.equal(service.normalizeType('video'), 'video');
    assert.equal(service.normalizeType('bad'), 'all');
    assert.equal(service.normalizePage(-1), 1);
    assert.equal(service.normalizePage(3.9), 3);
    assert.equal(service.normalizePageSize(999), 30);
    assert.equal(service.normalizeAuthorId(2.8), 2);
    assert.equal(service.normalizeAuthorId(0), undefined);
  });

  it('filters feed items by video, post and all types', () => {
    const service = makeService();
    const items = [{ type: 'video' }, { type: 'text' }, { type: 'image' }, { type: 'live' }];

    assert.equal(service.filterByType(items, 'all').length, 4);
    assert.deepEqual(service.filterByType(items, 'post').map((item) => item.type), ['text', 'image']);
    assert.deepEqual(service.filterByType(items, 'live'), [{ type: 'live' }]);
  });
});

describe('FeedService item conversion and scoring', () => {
  it('converts video records to feed items with stable id, author, cover and stats', () => {
    const service = makeService();
    const item = service.videoToFeedItem({
      id: 7,
      creatorId: 2,
      creator: { id: 2, nickname: 'Alice', avatarUrl: '/a.png' },
      title: 'Video',
      description: 'Desc',
      coverUrl: '',
      durationSeconds: 90,
      category: 'tech',
      publishedAt: new Date('2026-01-01T00:00:00Z'),
      playCount: 10,
      likeCount: 2,
      commentCount: 1,
      favoriteCount: 3,
    }, 'recommended', 0, 10);

    assert.equal(item.id, 'video-7');
    assert.equal(item.type, 'video');
    assert.equal(item.author.username, 'Alice');
    assert.match(item.cover, /^https:\/\/picsum\.photos\/seed\/guanlan-video-7/);
    assert.deepEqual(item.stats, { views: 10, likes: 2, comments: 1, favorites: 3 });
    assert.equal(item.score > 0, true);
  });

  it('converts dynamic posts and strips internal score before response', () => {
    const service = makeService();
    const post = service.dynamicPostToFeedItem({
      id: 'post-1',
      content: 'hello dynamic',
      images: ['a.png'],
      author: { id: '1', username: 'Alice' },
      createdAt: new Date().toISOString(),
      likeCount: 1,
      commentCount: 2,
      favoriteCount: 3,
      liked: true,
    }, 'following');

    assert.equal(post.type, 'image_text');
    assert.equal(post.title, 'hello dynamic');
    assert.equal(post.stats.liked, true);
    const publicItem = service.withoutScore(post);
    assert.equal(Object.hasOwn(publicItem, 'score'), false);
  });

  it('extracts numeric ids and ranks recommendation positions', () => {
    const service = makeService();

    assert.equal(service.extractNumericId('video-12', 'video-'), 12);
    assert.equal(service.extractNumericId('bad-12', 'video-'), null);
    assert.equal(service.rankToRecommendationScore(0, 4), 1);
    assert.equal(service.rankToRecommendationScore(999, 1000), 0.45);
    assert.equal(service.rankToRecommendationScore(0, 1), 0.7);
  });
});
