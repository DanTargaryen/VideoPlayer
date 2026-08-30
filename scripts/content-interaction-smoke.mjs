import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { issueServiceToken } from '@videoplayer/shared-contracts';

const baseUrl = (process.env.CONTENT_BASE_URL ?? 'http://127.0.0.1:3102').replace(/\/$/, '');
const secret = process.env.SERVICE_JWT_SECRET?.trim();
if (!secret || secret.length < 32) throw new Error('SERVICE_JWT_SECRET with at least 32 characters is required');
const userToken = process.env.CONTENT_USER_TOKEN?.trim();

const runId = (process.env.CONTENT_INTERACTION_RUN_ID ?? randomUUID()).slice(0, 48);

function trustedHeaders(requestId, options = {}) {
  if (userToken) {
    return {
      'x-request-id': requestId,
      authorization: `Bearer ${userToken}`,
      ...(options.json === false ? {} : { 'content-type': 'application/json' }),
    };
  }
  const token = issueServiceToken({
    caller: 'gateway',
    audience: 'content-media',
    scopes: ['content.user.forward'],
    secret,
    requestId,
  });
  return {
    'x-request-id': requestId,
    'x-gateway-authorization': `Bearer ${token}`,
    'x-user-id': String(options.userId ?? 2),
    'x-user-role': options.role ?? 'USER',
    'x-user-nickname': encodeURIComponent(options.nickname ?? '互动验收用户'),
    ...(options.json === false ? {} : { 'content-type': 'application/json' }),
  };
}

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const payload = await response.json();
  return { response, payload };
}

const ready = await request('/health/ready');
assert.equal(ready.response.status, 200);

const detailBefore = await request('/api/v1/videos/1');
assert.equal(detailBefore.response.status, 200);
const baseline = detailBefore.payload.data;

const folderRequestId = `content-smoke-${runId}-folder`;
const folder = await request('/api/v1/videos/my/favorite-folders', {
  method: 'POST',
  headers: trustedHeaders(folderRequestId),
  body: JSON.stringify({ name: `验收收藏-${runId}`.slice(0, 64) }),
});
assert.equal(folder.response.status, 200);
assert(folder.payload.data.id);
const duplicateFolder = await request('/api/v1/videos/my/favorite-folders', {
  method: 'POST',
  headers: trustedHeaders(`content-smoke-${runId}-folder-duplicate`),
  body: JSON.stringify({ name: folder.payload.data.name }),
});
assert.equal(duplicateFolder.response.status, 409);

const commentRequestId = `content-smoke-${runId}-comment`;
const commentBody = JSON.stringify({ content: `真实 MySQL 评论 ${runId}` });
const comment = await request('/api/v1/videos/1/comments', { method: 'POST', headers: trustedHeaders(commentRequestId), body: commentBody });
const commentReplay = await request('/api/v1/videos/1/comments', { method: 'POST', headers: trustedHeaders(commentRequestId), body: commentBody });
assert.equal(comment.response.status, 200);
assert.deepEqual(comment.payload.data, commentReplay.payload.data);
const commentConflict = await request('/api/v1/videos/1/comments', { method: 'POST', headers: trustedHeaders(commentRequestId), body: JSON.stringify({ content: 'different payload' }) });
assert.equal(commentConflict.response.status, 409);

const comments = await request('/api/v1/videos/1/comments');
assert.equal(comments.response.status, 200);
assert(comments.payload.data.items.some((item) => String(item.id) === String(comment.payload.data.id)));

const likeRequestId = `content-smoke-${runId}-like`;
const like = await request('/api/v1/videos/1/like', { method: 'POST', headers: trustedHeaders(likeRequestId), body: '{}' });
const likeReplay = await request('/api/v1/videos/1/like', { method: 'POST', headers: trustedHeaders(likeRequestId), body: '{}' });
assert.equal(like.response.status, 200);
assert.deepEqual(like.payload.data, likeReplay.payload.data);

const favoriteRequestId = `content-smoke-${runId}-favorite`;
const favorite = await request('/api/v1/videos/1/favorite', {
  method: 'POST',
  headers: trustedHeaders(favoriteRequestId),
  body: JSON.stringify({ folderId: folder.payload.data.id }),
});
assert.equal(favorite.response.status, 200);
assert.equal(favorite.payload.data.folderName, folder.payload.data.name);

const favoriteList = await request(`/api/v1/videos/my/favorites?folderId=${encodeURIComponent(folder.payload.data.id)}`, {
  headers: trustedHeaders(`content-smoke-${runId}-favorite-list`, { json: false }),
});
assert.equal(favoriteList.response.status, 200);
assert(favoriteList.payload.data.some((video) => String(video.id) === '1'));

const playRequestId = `content-smoke-${runId}-play`;
const playBody = JSON.stringify({ videoDurationSeconds: 92 });
const play = await request('/api/v1/videos/1/play', { method: 'POST', headers: { 'x-request-id': playRequestId, 'content-type': 'application/json' }, body: playBody });
const playReplay = await request('/api/v1/videos/1/play', { method: 'POST', headers: { 'x-request-id': playRequestId, 'content-type': 'application/json' }, body: playBody });
assert.equal(play.response.status, 200);
assert.deepEqual(play.payload.data, playReplay.payload.data);

const watch = await request('/api/v1/videos/1/watch-progress', {
  method: 'POST',
  headers: trustedHeaders(`content-smoke-${runId}-watch`),
  body: JSON.stringify({ watchedSeconds: 90, currentTimeSeconds: 92, videoDurationSeconds: 92, event: 'ended' }),
});
assert.equal(watch.response.status, 200);
assert.equal(Number(watch.payload.data.completedCount), 1);

const danmaku = await request('/api/v1/videos/1/danmaku', {
  method: 'POST',
  headers: trustedHeaders(`content-smoke-${runId}-danmaku`),
  body: JSON.stringify({ content: `弹幕 ${runId}`, timeOffsetMs: 2_345, color: '#12abef' }),
});
assert.equal(danmaku.response.status, 200);
assert.equal(danmaku.payload.data.color, '#12ABEF');
const danmakuList = await request('/api/v1/videos/1/danmaku?fromMs=2000&toMs=3000');
assert(danmakuList.payload.data.some((item) => String(item.id) === String(danmaku.payload.data.id)));

const detailAfter = await request('/api/v1/videos/1', {
  headers: trustedHeaders(`content-smoke-${runId}-detail`, { json: false }),
});
assert.equal(detailAfter.payload.data.likeCount, baseline.likeCount + 1);
assert.equal(detailAfter.payload.data.favoriteCount, baseline.favoriteCount + 1);
assert.equal(detailAfter.payload.data.commentCount, baseline.commentCount + 1);
assert.equal(detailAfter.payload.data.playCount, baseline.playCount + 1);
assert.equal(detailAfter.payload.data.isLiked, true);
assert.equal(detailAfter.payload.data.isFavorited, true);

assert.equal((await request('/api/v1/videos/1/like', { method: 'DELETE', headers: trustedHeaders(`content-smoke-${runId}-unlike`) })).response.status, 200);
assert.equal((await request('/api/v1/videos/1/favorite', { method: 'DELETE', headers: trustedHeaders(`content-smoke-${runId}-unfavorite`) })).response.status, 200);
assert.equal((await request(`/api/v1/videos/1/comments/${encodeURIComponent(comment.payload.data.id)}`, { method: 'DELETE', headers: trustedHeaders(`content-smoke-${runId}-comment-withdraw`) })).response.status, 200);
assert.equal((await request(`/api/v1/videos/my/favorite-folders/${encodeURIComponent(folder.payload.data.id)}`, { method: 'DELETE', headers: trustedHeaders(`content-smoke-${runId}-folder-delete`) })).response.status, 200);

const directForgery = await request('/api/v1/videos/1/like', { method: 'POST', headers: { 'x-user-id': '2', 'x-request-id': `content-smoke-${runId}-forged` } });
assert.equal(directForgery.response.status, 401);

process.stdout.write(`content interaction smoke passed runId=${runId} comment=${comment.payload.data.id} folder=${folder.payload.data.id}\n`);
