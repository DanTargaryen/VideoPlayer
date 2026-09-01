import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const RESULT_STATUSES = Object.freeze(['PASS', 'FAIL', 'BLOCKED', 'NOT RUN']);
export const UC_IDS = Object.freeze(['UC01', 'UC02', 'UC03', 'UC04', 'UC05', 'UC06']);

export const UC_PUBLIC_ENDPOINTS = Object.freeze({
  UC01: ['POST /auth/register', 'POST /auth/login', 'GET /auth/me', 'PUT /users/profile', 'GET /admin/dashboard'],
  UC02: ['GET /feeds/recommend', 'GET /search/all', 'GET /videos/:id', 'POST /videos/:id/play', 'POST /videos/:id/watch-progress', 'GET /videos/my/history'],
  UC03: ['POST /videos/upload', 'POST /videos', 'GET /videos/:id', 'POST /videos/:id/submit-review', 'GET /admin/reviews/videos', 'POST /admin/reviews/videos/:id'],
  UC04: ['POST|DELETE /videos/:id/like', 'POST|DELETE /videos/:id/favorite', 'GET|POST /videos/:id/comments', 'GET|POST /videos/:id/danmaku', 'POST /users/:id/follow', 'GET /notifications'],
  UC05: ['GET /lives/center/overview', 'POST /lives/rooms', 'POST /lives/rooms/:id/start|stop', 'GET|POST /lives/rooms/:id/frame', 'POST|DELETE /lives/rooms/:id/viewers', 'GET|POST /lives/rooms/:id/messages', 'GET|POST /gift-coins/*', 'POST /videos/:id/coin', 'POST /lives/rooms/:id/replay', 'GET /lives/sessions/:id'],
  UC06: ['POST /reports', 'GET /admin/reports', 'POST /admin/reports/:id', 'GET /videos/:id', 'GET /notifications'],
});

export function targetConfigurations(env = process.env) {
  return [
    { name: 'monolith', baseUrl: env.MONOLITH_BASE_URL?.trim() || null },
    { name: 'microservice-gateway', baseUrl: env.MICROSERVICE_GATEWAY_BASE_URL?.trim() || null },
  ];
}

function normalizeBaseUrl(value) { return value.replace(/\/$/, ''); }
function targetPrefix(targetName) { return targetName === 'monolith' ? 'REG_MONOLITH_' : 'REG_MICROSERVICE_'; }
function targetValue(env, targetName, name, fallback) { return env[`${targetPrefix(targetName)}${name}`]?.trim() || env[`REG_${name}`]?.trim() || fallback; }
function requestId(context, suffix) { context.requestCounter += 1; return `reg-${context.targetName}-${context.runId}-${context.requestCounter}-${suffix}`.slice(0, 128); }
function bearer(token, extra = {}) { return { authorization: `Bearer ${token}`, ...extra }; }

async function readVersion(baseUrl, fetchImpl, targetName) {
  const headers = { 'x-request-id': `reg-01-version-${Date.now()}` };
  const response = await fetchImpl(`${normalizeBaseUrl(baseUrl)}/version`, { headers, signal: AbortSignal.timeout(2_000) });
  if (response.ok) return (await response.json())?.data ?? null;
  if (targetName !== 'monolith' || response.status !== 404) throw new Error(`version endpoint returned ${response.status}`);
  const health = await fetchImpl(`${normalizeBaseUrl(baseUrl)}/api/v1/health`, { headers, signal: AbortSignal.timeout(2_000) });
  if (!health.ok) throw new Error(`monolith health endpoint returned ${health.status}`);
  return (await health.json())?.data ?? null;
}

async function rawRequest(baseUrl, path, fetchImpl, options = {}) {
  const timeoutMs = options.timeoutMs ?? 5_000;
  const { timeoutMs: _ignored, ...requestOptions } = options;
  const response = await fetchImpl(`${normalizeBaseUrl(baseUrl)}${path}`, { ...requestOptions, signal: AbortSignal.timeout(timeoutMs) });
  const envelope = await response.json().catch(() => null);
  return { response, envelope, data: envelope?.data };
}

async function jsonRequest(baseUrl, path, fetchImpl, options = {}) {
  const result = await rawRequest(baseUrl, path, fetchImpl, options);
  if (!result.response.ok) throw new Error(`${path} returned ${result.response.status}: ${result.envelope?.message ?? 'unknown error'}`);
  return result.data;
}

async function expectStatus(baseUrl, path, fetchImpl, expected, options = {}) {
  const result = await rawRequest(baseUrl, path, fetchImpl, options);
  const statuses = Array.isArray(expected) ? expected : [expected];
  assert(statuses.includes(result.response.status), `${path} returned ${result.response.status}, expected ${statuses.join('/')}: ${result.envelope?.message ?? 'unknown error'}`);
  return result;
}

function expectId(value, name) {
  const id = value?.id ?? value?.userId ?? value?.videoId ?? value?.reviewId;
  assert(id !== undefined && id !== null && String(id).length > 0, `${name} did not return an ID`);
  return id;
}

function asList(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.list)) return value.list;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.videos)) return value.videos;
  if (Array.isArray(value?.video)) return value.video;
  return [];
}

async function waitFor(check, timeoutMs = 6_000) {
  const deadline = Date.now() + timeoutMs;
  let last;
  while (Date.now() < deadline) {
    last = await check();
    if (last) return last;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return last;
}

function createValidMediaBytes() {
  const directory = mkdtempSync(join(tmpdir(), 'reg-01-media-'));
  try {
    const mediaPath = join(directory, 'regression.mp4');
    execFileSync(process.env.FFMPEG_PATH ?? 'ffmpeg', ['-y', '-f', 'lavfi', '-i', 'color=c=purple:s=32x32:d=0.2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mediaPath], { stdio: 'ignore' });
    return readFileSync(mediaPath);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

async function registerLogin(context, kind) {
  if (context[kind]) return context[kind];
  const suffix = kind === 'creator' ? 'creator' : 'actor';
  const username = `reg_${context.targetSlug}_${context.runId}_${suffix}`.slice(0, 60);
  const password = 'Regression123!';
  const email = `${username}@example.invalid`;
  const nickname = kind === 'creator' ? 'REG 创作者' : 'REG 互动用户';
  const registration = await jsonRequest(context.baseUrl, '/api/v1/auth/register', context.fetchImpl, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-request-id': requestId(context, `${kind}-register`) }, body: JSON.stringify({ username, password, email, nickname }),
  });
  const registeredId = expectId(registration, `${kind} registration`);
  const login = await jsonRequest(context.baseUrl, '/api/v1/auth/login', context.fetchImpl, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-request-id': requestId(context, `${kind}-login`) }, body: JSON.stringify({ account: username, password }),
  });
  assert(login?.token, `${kind} login did not return a token`);
  assert.equal(String(login.userId), String(registeredId));
  context[kind] = { id: login.userId, token: login.token, username, password, email, nickname };
  return context[kind];
}

async function adminLogin(context) {
  if (context.admin) return context.admin;
  const adminSecret = targetValue(context.env, context.targetName, 'ADMIN_SECRET', context.targetName === 'monolith' ? '123456' : undefined);
  assert(adminSecret, `${targetPrefix(context.targetName)}ADMIN_SECRET is required`);
  const login = await jsonRequest(context.baseUrl, '/api/v1/auth/login', context.fetchImpl, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-request-id': requestId(context, 'admin-login') }, body: JSON.stringify({ adminSecret }),
  });
  assert(login?.token, 'admin login did not return a token');
  context.admin = { id: login.userId, token: login.token };
  return context.admin;
}

async function uploadMedia(context, owner, assetType, filename = 'regression.mp4') {
  const form = new FormData();
  form.set('file', new Blob([context.mediaBytes], { type: 'video/mp4' }), filename);
  const upload = await jsonRequest(context.baseUrl, `/api/v1/videos/upload?assetType=${assetType}`, context.fetchImpl, {
    method: 'POST', headers: bearer(owner.token, { 'x-request-id': requestId(context, `upload-${assetType}`) }), body: form, timeoutMs: 15_000,
  });
  assert(upload?.assetId !== undefined && upload?.uploadToken, `${assetType} upload returned an invalid asset`);
  return upload;
}

async function runUc01(context) {
  const creator = await registerLogin(context, 'creator');
  const wrong = await expectStatus(context.baseUrl, '/api/v1/auth/login', context.fetchImpl, 401, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ account: creator.username, password: 'WrongPassword!' }),
  });
  assert(!wrong.data?.token, 'wrong-password login unexpectedly returned a token');
  const before = await jsonRequest(context.baseUrl, '/api/v1/auth/me', context.fetchImpl, { headers: bearer(creator.token) });
  assert.equal(String(before.id), String(creator.id));
  const updatedNickname = `REG-${context.targetSlug}-${context.runId}`.slice(0, 60);
  await jsonRequest(context.baseUrl, '/api/v1/users/profile', context.fetchImpl, {
    method: 'PUT', headers: bearer(creator.token, { 'content-type': 'application/json', 'x-request-id': requestId(context, 'profile') }), body: JSON.stringify({ nickname: updatedNickname, bio: 'REG-01 UC01' }),
  });
  const relogin = await jsonRequest(context.baseUrl, '/api/v1/auth/login', context.fetchImpl, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ account: creator.username, password: creator.password }),
  });
  creator.token = relogin.token;
  const after = await jsonRequest(context.baseUrl, '/api/v1/auth/me', context.fetchImpl, { headers: bearer(creator.token) });
  assert.equal(after.nickname, updatedNickname);
  await expectStatus(context.baseUrl, '/api/v1/admin/dashboard', context.fetchImpl, [401, 403], { headers: bearer(creator.token) });
  return `user ${creator.id} profile persisted; wrong password and non-admin access rejected`;
}

async function runUc03(context) {
  const creator = await registerLogin(context, 'creator');
  const admin = await adminLogin(context);
  const invalidForm = new FormData();
  invalidForm.set('file', new Blob(['not a video'], { type: 'video/mp4' }), 'invalid.mp4');
  await expectStatus(context.baseUrl, '/api/v1/videos/upload?assetType=ORIGINAL', context.fetchImpl, 400, {
    method: 'POST', headers: bearer(creator.token, { 'x-request-id': requestId(context, 'invalid-upload') }), body: invalidForm, timeoutMs: 15_000,
  });
  const upload = await uploadMedia(context, creator, 'ORIGINAL');
  const title = `REG01 ${context.targetSlug} ${context.runId}`;
  const video = await jsonRequest(context.baseUrl, '/api/v1/videos', context.fetchImpl, {
    method: 'POST', headers: bearer(creator.token, { 'content-type': 'application/json', 'x-request-id': requestId(context, 'video-create') }),
    body: JSON.stringify({ assetId: upload.assetId, uploadToken: upload.uploadToken, title, description: 'REG-01 UC03 publish workflow', categories: ['tech'] }), timeoutMs: 10_000,
  });
  const videoId = expectId(video, 'video draft');
  await expectStatus(context.baseUrl, `/api/v1/videos/${videoId}`, context.fetchImpl, 404);
  const submission = await jsonRequest(context.baseUrl, `/api/v1/videos/${videoId}/submit-review`, context.fetchImpl, {
    method: 'POST', headers: bearer(creator.token, { 'x-request-id': requestId(context, 'review-submit') }), timeoutMs: 10_000,
  });
  const reviewId = submission?.reviewId;
  assert(reviewId !== undefined, 'review submission did not return reviewId');
  const queue = await jsonRequest(context.baseUrl, '/api/v1/admin/reviews/videos', context.fetchImpl, { headers: bearer(admin.token) });
  assert(asList(queue).some((item) => String(item.id) === String(reviewId)), 'review is absent from admin queue');
  await jsonRequest(context.baseUrl, `/api/v1/admin/reviews/videos/${reviewId}`, context.fetchImpl, {
    method: 'POST', headers: bearer(admin.token, { 'content-type': 'application/json', 'x-request-id': requestId(context, 'review-approve') }), body: JSON.stringify({ action: 'APPROVE' }), timeoutMs: 10_000,
  });
  const published = await jsonRequest(context.baseUrl, `/api/v1/videos/${videoId}`, context.fetchImpl, { headers: bearer(creator.token) });
  assert.equal(String(published.id), String(videoId));
  assert.equal(published.status, 'PUBLISHED');
  context.video = { id: videoId, title, creatorId: creator.id };
  return `invalid upload rejected; video ${videoId} hidden as draft then approved and published`;
}

async function runUc02(context) {
  const creator = await registerLogin(context, 'creator');
  const videoId = context.video?.id ?? targetValue(context.env, context.targetName, 'VIDEO_ID', '1');
  const detail = await jsonRequest(context.baseUrl, `/api/v1/videos/${videoId}`, context.fetchImpl, { headers: bearer(creator.token) });
  assert.equal(String(detail.id), String(videoId));
  const feed = await jsonRequest(context.baseUrl, '/api/v1/feeds/recommend?page=1&pageSize=10', context.fetchImpl, { headers: bearer(creator.token) });
  assert(asList(feed).length > 0, 'recommend feed is empty');
  const keyword = encodeURIComponent(String(detail.title).slice(0, 20));
  const search = await jsonRequest(context.baseUrl, `/api/v1/search/all?keyword=${keyword}&tab=video&page=1&pageSize=10`, context.fetchImpl, { headers: bearer(creator.token) });
  assert(asList(search).some((item) => String(item.id) === String(videoId)), 'published video is absent from search');
  await jsonRequest(context.baseUrl, `/api/v1/videos/${videoId}/play`, context.fetchImpl, {
    method: 'POST', headers: bearer(creator.token, { 'content-type': 'application/json', 'x-request-id': requestId(context, 'play') }), body: JSON.stringify({ videoDurationSeconds: 60 }),
  });
  await jsonRequest(context.baseUrl, `/api/v1/videos/${videoId}/watch-progress`, context.fetchImpl, {
    method: 'POST', headers: bearer(creator.token, { 'content-type': 'application/json', 'x-request-id': requestId(context, 'watch') }), body: JSON.stringify({ watchedSeconds: 12, currentTimeSeconds: 12, videoDurationSeconds: 60, event: 'pause' }),
  });
  const history = await jsonRequest(context.baseUrl, '/api/v1/videos/my/history', context.fetchImpl, { headers: bearer(creator.token) });
  assert(asList(history).some((item) => String(item.id) === String(videoId)), 'watched video is absent from history');
  const missing = await jsonRequest(context.baseUrl, `/api/v1/search/all?keyword=${encodeURIComponent(`REG-NOT-FOUND-${context.runId}`)}&tab=video&page=1&pageSize=10`, context.fetchImpl);
  assert.equal(Number(missing?.counts?.video ?? asList(missing).length), 0);
  return `recommend/search/detail/play/watch/history passed for video ${videoId}; no-result search returned zero`;
}

async function runUc04(context) {
  const creator = await registerLogin(context, 'creator');
  const actor = await registerLogin(context, 'actor');
  assert(context.video?.id, 'UC03 published video is required for UC04');
  const videoId = context.video.id;
  const like = await jsonRequest(context.baseUrl, `/api/v1/videos/${videoId}/like`, context.fetchImpl, { method: 'POST', headers: bearer(actor.token, { 'x-request-id': requestId(context, 'like') }) });
  assert.equal(like.liked, true);
  const unlike = await jsonRequest(context.baseUrl, `/api/v1/videos/${videoId}/like`, context.fetchImpl, { method: 'DELETE', headers: bearer(actor.token, { 'x-request-id': requestId(context, 'unlike') }) });
  assert.equal(unlike.liked, false);
  const favorite = await jsonRequest(context.baseUrl, `/api/v1/videos/${videoId}/favorite`, context.fetchImpl, { method: 'POST', headers: bearer(actor.token, { 'content-type': 'application/json', 'x-request-id': requestId(context, 'favorite') }), body: '{}' });
  assert.equal(favorite.favorited, true);
  const unfavorite = await jsonRequest(context.baseUrl, `/api/v1/videos/${videoId}/favorite`, context.fetchImpl, { method: 'DELETE', headers: bearer(actor.token, { 'x-request-id': requestId(context, 'unfavorite') }) });
  assert.equal(unfavorite.favorited, false);
  const comment = await jsonRequest(context.baseUrl, `/api/v1/videos/${videoId}/comments`, context.fetchImpl, {
    method: 'POST', headers: bearer(actor.token, { 'content-type': 'application/json', 'x-request-id': requestId(context, 'comment') }), body: JSON.stringify({ content: 'REG-01 UC04 comment' }),
  });
  const commentId = expectId(comment, 'comment');
  const comments = await jsonRequest(context.baseUrl, `/api/v1/videos/${videoId}/comments`, context.fetchImpl);
  assert(asList(comments).some((item) => String(item.id) === String(commentId)), 'comment is absent after reload');
  const danmaku = await jsonRequest(context.baseUrl, `/api/v1/videos/${videoId}/danmaku`, context.fetchImpl, {
    method: 'POST', headers: bearer(actor.token, { 'content-type': 'application/json', 'x-request-id': requestId(context, 'danmaku') }), body: JSON.stringify({ content: 'REG-01 danmaku', timeOffsetMs: 1_000, color: '#ffffff' }),
  });
  const danmakuId = expectId(danmaku, 'danmaku');
  const danmakus = await jsonRequest(context.baseUrl, `/api/v1/videos/${videoId}/danmaku?fromMs=0&toMs=5000`, context.fetchImpl);
  assert(asList(danmakus).some((item) => String(item.id) === String(danmakuId)), 'danmaku is absent after reload');
  const followed = await jsonRequest(context.baseUrl, `/api/v1/users/${creator.id}/follow`, context.fetchImpl, { method: 'POST', headers: bearer(actor.token, { 'x-request-id': requestId(context, 'follow') }) });
  assert.equal(followed.followed, true);
  const repeated = await jsonRequest(context.baseUrl, `/api/v1/users/${creator.id}/follow`, context.fetchImpl, { method: 'POST', headers: bearer(actor.token, { 'x-request-id': requestId(context, 'follow-repeat') }) });
  assert.equal(repeated.followed, true);
  const notification = await waitFor(async () => {
    const items = await jsonRequest(context.baseUrl, '/api/v1/notifications', context.fetchImpl, { headers: bearer(creator.token) });
    return asList(items).find((item) => ['COMMENT', 'FOLLOW'].includes(item.type));
  });
  assert(notification, 'creator did not receive COMMENT/FOLLOW notification');
  return `like/favorite toggles, comment ${commentId}, danmaku ${danmakuId}, idempotent follow and creator notification passed`;
}

async function runUc05(context) {
  const creator = await registerLogin(context, 'creator');
  const actor = await registerLogin(context, 'actor');
  await jsonRequest(context.baseUrl, '/api/v1/lives/center/overview', context.fetchImpl, { headers: bearer(creator.token) });
  const room = await jsonRequest(context.baseUrl, '/api/v1/lives/rooms', context.fetchImpl, {
    method: 'POST', headers: bearer(creator.token, { 'content-type': 'application/json', 'x-request-id': requestId(context, 'live-room') }), body: JSON.stringify({ title: `REG-01 UC05 ${context.runId}`, category: 'tech' }),
  });
  const roomId = expectId(room, 'live room');
  const started = await jsonRequest(context.baseUrl, `/api/v1/lives/rooms/${roomId}/start`, context.fetchImpl, { method: 'POST', headers: bearer(creator.token, { 'x-request-id': requestId(context, 'live-start') }) });
  assert.equal(started.status, 'LIVING');
  const frame = 'data:image/jpeg;base64,AA==';
  await jsonRequest(context.baseUrl, `/api/v1/lives/rooms/${roomId}/frame`, context.fetchImpl, { method: 'POST', headers: bearer(creator.token, { 'content-type': 'application/json', 'x-request-id': requestId(context, 'frame') }), body: JSON.stringify({ image: frame }) });
  const fetchedFrame = await jsonRequest(context.baseUrl, `/api/v1/lives/rooms/${roomId}/frame`, context.fetchImpl, { headers: bearer(actor.token) });
  assert.equal(fetchedFrame.image, frame);
  const viewer = await jsonRequest(context.baseUrl, `/api/v1/lives/rooms/${roomId}/viewers`, context.fetchImpl, { method: 'POST', headers: bearer(actor.token, { 'content-type': 'application/json', 'x-request-id': requestId(context, 'viewer') }), body: '{}' });
  assert(viewer.viewerId !== undefined, 'viewer ticket is invalid');
  const message = await jsonRequest(context.baseUrl, `/api/v1/lives/rooms/${roomId}/messages`, context.fetchImpl, { method: 'POST', headers: bearer(actor.token, { 'content-type': 'application/json', 'x-request-id': requestId(context, 'live-message') }), body: JSON.stringify({ content: 'REG-01 UC05 message' }) });
  const messages = await jsonRequest(context.baseUrl, `/api/v1/lives/rooms/${roomId}/messages`, context.fetchImpl);
  assert(asList(messages).some((item) => String(item.id) === String(message.id)), 'live message is absent after reload');
  const walletBefore = await jsonRequest(context.baseUrl, '/api/v1/gift-coins/wallet', context.fetchImpl, { headers: bearer(actor.token) });
  await jsonRequest(context.baseUrl, '/api/v1/gift-coins/daily-claim', context.fetchImpl, { method: 'POST', headers: bearer(actor.token, { 'x-request-id': requestId(context, 'daily') }) });
  if (context.video?.id) await jsonRequest(context.baseUrl, `/api/v1/videos/${context.video.id}/coin`, context.fetchImpl, { method: 'POST', headers: bearer(actor.token, { 'content-type': 'application/json', 'x-request-id': requestId(context, 'coin') }), body: JSON.stringify({ amount: 1 }) });
  const walletAfter = await jsonRequest(context.baseUrl, '/api/v1/gift-coins/wallet', context.fetchImpl, { headers: bearer(actor.token) });
  assert(Number.isInteger(walletBefore.balance) && Number.isInteger(walletAfter.balance));
  await jsonRequest(context.baseUrl, `/api/v1/lives/rooms/${roomId}/viewers/${viewer.viewerId}`, context.fetchImpl, { method: 'DELETE', headers: bearer(actor.token, { 'x-request-id': requestId(context, 'viewer-leave') }) });
  const stopped = await jsonRequest(context.baseUrl, `/api/v1/lives/rooms/${roomId}/stop`, context.fetchImpl, { method: 'POST', headers: bearer(creator.token, { 'x-request-id': requestId(context, 'live-stop') }) });
  assert.equal(stopped.status, 'ENDED');
  const replayAsset = await uploadMedia(context, creator, 'RECORDING', 'regression-replay.mp4');
  const replay = await jsonRequest(context.baseUrl, `/api/v1/lives/rooms/${roomId}/replay`, context.fetchImpl, {
    method: 'POST', headers: bearer(creator.token, { 'content-type': 'application/json', 'x-request-id': requestId(context, 'replay') }), body: JSON.stringify({ saveMode: 'UPLOAD', assetId: replayAsset.assetId, uploadToken: replayAsset.uploadToken, title: `REG-01 Replay ${context.runId}` }), timeoutMs: 10_000,
  });
  assert(replay.replayVideoId !== undefined && replay.replayVideoId !== null, 'replay did not create a content video');
  const session = await jsonRequest(context.baseUrl, `/api/v1/lives/sessions/${started.sessionId}`, context.fetchImpl);
  assert.equal(session.status, 'ENDED');
  return `room ${roomId}, frame, viewer, message, wallet/coin, stop and replay ${replay.replayVideoId} passed`;
}

async function runUc06(context) {
  const actor = await registerLogin(context, 'actor');
  const admin = await adminLogin(context);
  const targetId = context.video?.id ?? targetValue(context.env, context.targetName, 'UC06_TARGET_ID', '1');
  const report = await jsonRequest(context.baseUrl, '/api/v1/reports', context.fetchImpl, {
    method: 'POST', headers: bearer(actor.token, { 'content-type': 'application/json', 'x-request-id': requestId(context, 'report') }), body: JSON.stringify({ targetType: 'VIDEO', targetId, reason: `REG-01 UC06 ${context.runId}` }),
  });
  const reportId = expectId(report, 'report');
  const listed = await jsonRequest(context.baseUrl, '/api/v1/admin/reports', context.fetchImpl, { headers: bearer(admin.token) });
  assert(asList(listed).some((item) => String(item.id) === String(reportId) && item.status === 'PENDING'), 'pending report is absent from admin queue');
  const handled = await jsonRequest(context.baseUrl, `/api/v1/admin/reports/${reportId}`, context.fetchImpl, {
    method: 'POST', headers: bearer(admin.token, { 'content-type': 'application/json', 'x-request-id': requestId(context, 'report-handle') }), body: JSON.stringify({ action: 'KEEP', reason: 'REG-01 automated verification' }), timeoutMs: 10_000,
  });
  assert.equal((handled?.report ?? handled)?.status, 'REJECTED');
  await expectStatus(context.baseUrl, `/api/v1/admin/reports/${reportId}`, context.fetchImpl, [400, 409], {
    method: 'POST', headers: bearer(admin.token, { 'content-type': 'application/json', 'x-request-id': requestId(context, 'report-duplicate') }), body: JSON.stringify({ action: 'KEEP' }),
  });
  const target = await jsonRequest(context.baseUrl, `/api/v1/videos/${targetId}`, context.fetchImpl);
  assert.equal(target.status, 'PUBLISHED');
  const notification = await waitFor(async () => {
    const items = await jsonRequest(context.baseUrl, '/api/v1/notifications', context.fetchImpl, { headers: bearer(actor.token) });
    return asList(items).find((item) => item.type === 'REPORT' && String(item.relatedId) === String(reportId));
  });
  assert(notification, 'reporter did not receive REPORT notification');
  return `report ${reportId} handled once, duplicate rejected, content preserved and reporter notified`;
}

const FULL_EXECUTION_ORDER = [['UC01', runUc01], ['UC03', runUc03], ['UC02', runUc02], ['UC04', runUc04], ['UC05', runUc05], ['UC06', runUc06]];

async function runFullTarget(target, env, fetchImpl, mediaBytes) {
  const context = { targetName: target.name, targetSlug: target.name === 'monolith' ? 'mono' : 'micro', baseUrl: target.baseUrl, env, fetchImpl, mediaBytes, requestCounter: 0, runId: (env.REG_RUN_ID?.trim() || `${Date.now()}`).replace(/[^a-zA-Z0-9]/g, '').slice(-20) };
  const results = new Map();
  for (const [id, execute] of FULL_EXECUTION_ORDER) {
    try {
      const detail = await execute(context);
      results.set(id, { id, status: 'PASS', detail, endpoints: UC_PUBLIC_ENDPOINTS[id] });
    } catch (error) {
      results.set(id, { id, status: 'FAIL', detail: error instanceof Error ? error.message : String(error), endpoints: UC_PUBLIC_ENDPOINTS[id] });
    }
  }
  return UC_IDS.map((id) => results.get(id) ?? { id, status: 'FAIL', detail: 'use case did not execute', endpoints: UC_PUBLIC_ENDPOINTS[id] });
}

async function runLegacyUc06(baseUrl, env, fetchImpl, targetName) {
  const context = { targetName, targetSlug: targetName === 'monolith' ? 'mono' : 'micro', baseUrl, env, fetchImpl, requestCounter: 0, runId: (env.REG_RUN_ID?.trim() || `${Date.now()}`).replace(/[^a-zA-Z0-9]/g, '').slice(-20), actor: { token: '' } };
  const reporter = await jsonRequest(baseUrl, '/api/v1/auth/login', fetchImpl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ account: env.REG_REPORTER_ACCOUNT, password: env.REG_REPORTER_PASSWORD }) });
  context.actor = { id: reporter.userId, token: reporter.token };
  const admin = await jsonRequest(baseUrl, '/api/v1/auth/login', fetchImpl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ adminSecret: env.REG_ADMIN_SECRET }) });
  context.admin = { id: admin.userId, token: admin.token };
  context.video = { id: env.REG_UC06_TARGET_ID || '1' };
  const detail = await runUc06(context);
  return { id: 'UC06', status: 'PASS', detail, endpoints: UC_PUBLIC_ENDPOINTS.UC06 };
}

export async function runRegression(options = {}) {
  const env = options.env ?? process.env;
  const fetchImpl = options.fetchImpl ?? fetch;
  const generatedAt = (options.now ?? new Date()).toISOString();
  const runAll = env.REG_RUN_ALL === 'true';
  const mediaBytes = runAll ? (options.mediaBytes ?? createValidMediaBytes()) : null;
  const targets = [];
  for (const target of targetConfigurations(env)) {
    if (!target.baseUrl) {
      targets.push({ ...target, gitSha: env.GIT_SHA?.trim() || 'unknown', serviceVersions: null, preflight: { status: 'BLOCKED', detail: 'base URL is not configured' }, useCases: UC_IDS.map((id) => ({ id, status: 'NOT RUN', endpoints: UC_PUBLIC_ENDPOINTS[id] })) });
      continue;
    }
    try {
      const version = await readVersion(target.baseUrl, fetchImpl, target.name);
      let useCases = UC_IDS.map((id) => ({ id, status: 'NOT RUN', endpoints: UC_PUBLIC_ENDPOINTS[id] }));
      if (runAll) useCases = await runFullTarget(target, env, fetchImpl, mediaBytes);
      else if (env.REG_RUN_UC06 === 'true') {
        const index = useCases.findIndex((item) => item.id === 'UC06');
        try { useCases[index] = await runLegacyUc06(target.baseUrl, env, fetchImpl, target.name); }
        catch (error) { useCases[index] = { id: 'UC06', status: 'FAIL', detail: error instanceof Error ? error.message : String(error), endpoints: UC_PUBLIC_ENDPOINTS.UC06 }; }
      }
      targets.push({ ...target, gitSha: env.GIT_SHA?.trim() || version?.version || 'unknown', serviceVersions: version, preflight: { status: 'PASS', detail: 'version endpoint reachable' }, useCases });
    } catch (error) {
      targets.push({ ...target, gitSha: env.GIT_SHA?.trim() || 'unknown', serviceVersions: null, preflight: { status: 'FAIL', detail: error instanceof Error ? error.message : String(error) }, useCases: UC_IDS.map((id) => ({ id, status: 'NOT RUN', endpoints: UC_PUBLIC_ENDPOINTS[id] })) });
    }
  }
  return { schemaVersion: 'reg-01/v2', generatedAt, statuses: RESULT_STATUSES, endpointCoverage: UC_PUBLIC_ENDPOINTS, targets, note: runAll ? 'UC01-UC06 executed for every configured target.' : env.REG_RUN_UC06 === 'true' ? 'UC06 executed; UC01-UC05 remain explicitly NOT RUN.' : 'Set REG_RUN_ALL=true for full UC01-UC06 or REG_RUN_UC06=true for the focused governance flow.' };
}
