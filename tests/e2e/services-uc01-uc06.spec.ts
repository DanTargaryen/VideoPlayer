import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

import { expect, test, type Page } from '@playwright/test';

const adminToken = requiredEnvironment('SERVICES_MODE_ADMIN_TOKEN');
const creatorToken = requiredEnvironment('SERVICES_MODE_CREATOR_TOKEN');
const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
const creatorUserId = 1;
const adminUserId = 2;
const password = 'BrowserUc123!';
const runId = `${Date.now().toString(36)}-${process.pid}`;
const actorUsername = `browser_actor_${runId}`;
const actorNickname = `浏览器用户-${runId}`;
const updatedActorNickname = `浏览器资料-${runId}`;
const publishedVideoTitle = `UC03 浏览器稿件 ${runId}`;
const publishedVideoDescription = 'Playwright 通过真实 Vue 投稿、提审和管理审核完成的稿件。';
const reportReason = `UC06 浏览器举报 ${runId}`;

let actorToken = '';
let actorUserId = 0;
let publishedVideoId = 0;

test.describe.serial('services-mode UC01-UC06 browser regression', () => {
  test('UC01 registers through the UI and persists a profile update', async ({ page }) => {
    await page.goto('/register');
    await page.getByLabel('用户名').fill(actorUsername);
    await page.getByLabel('密码').fill(password);
    await page.getByLabel('昵称（可选）').fill(actorNickname);
    await page.getByLabel('邮箱（可选）').fill(`${actorUsername}@local.invalid`);
    await page.getByRole('button', { name: '注册', exact: true }).click();

    await expect(page).toHaveURL(/\/$/);
    const session = await readBrowserSession(page);
    actorToken = session.token;
    actorUserId = session.userId;
    expect(actorToken).toBeTruthy();
    expect(actorUserId).toBeGreaterThan(0);

    await page.goto('/user/dashboard');
    await expect(page.getByRole('heading', { name: actorNickname })).toBeVisible();
    await page.getByRole('button', { name: '账号设置', exact: true }).click();
    const nicknameInput = page.getByPlaceholder('输入要显示给其他用户看的昵称');
    await nicknameInput.fill(updatedActorNickname);
    await nicknameInput
      .locator('xpath=ancestor::div[contains(@class,"form-row")]')
      .getByRole('button', { name: '保存', exact: true })
      .click();
    await expect(page.locator('.profile-banner h1')).toHaveText(updatedActorNickname);
  });

  test('UC03 uploads, submits, approves, and publishes a video through browser pages', async ({
    page,
  }, testInfo) => {
    await setBrowserSession(page, {
      token: creatorToken,
      userId: creatorUserId,
      nickname: '中文用户',
      role: 'user',
    });

    const mediaPath = testInfo.outputPath('uc03-browser.mp4');
    execFileSync(
      ffmpegPath,
      [
        '-y',
        '-f',
        'lavfi',
        '-i',
        'color=c=blue:s=64x64:d=0.4',
        '-c:v',
        'libx264',
        '-pix_fmt',
        'yuv420p',
        '-movflags',
        '+faststart',
        mediaPath,
      ],
      { stdio: 'ignore' },
    );

    await page.goto('/upload');
    await page.getByLabel('标题').fill(publishedVideoTitle);
    await page.getByLabel('简介').fill(publishedVideoDescription);
    await page.locator('input[type="file"][accept*="video"]').setInputFiles(mediaPath);
    await expect(page.getByText(/已选择：uc03-browser\.mp4/)).toBeVisible();
    await page.getByRole('button', { name: '创建稿件', exact: true }).click();

    await expect(page).toHaveURL(/\/user\/dashboard$/);
    const creatorCard = page.locator('.video-card').filter({ hasText: publishedVideoTitle });
    await expect(creatorCard).toBeVisible();
    const submitResponse = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        /\/api\/v1\/videos\/\d+\/submit-review$/.test(response.url()),
    );
    await creatorCard.getByRole('button', { name: '提交审核', exact: true }).click();
    expect((await submitResponse).status()).toBe(200);
    await expect(creatorCard.getByText('待审核', { exact: true })).toBeVisible();

    await setBrowserSession(page, {
      token: adminToken,
      userId: adminUserId,
      nickname: '中文管理员',
      role: 'admin',
    });
    await page.goto('/admin/dashboard');
    const reviewCard = page.locator('.review-card').filter({ hasText: publishedVideoTitle }).first();
    await expect(reviewCard).toBeVisible();
    const approveResponse = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        /\/api\/v1\/admin\/reviews\/videos\/\d+$/.test(response.url()),
    );
    await reviewCard.getByRole('button', { name: '通过', exact: true }).click();
    expect((await approveResponse).status()).toBe(200);
    await expect(reviewCard).toBeHidden();

    await page.goto(`/search?keyword=${encodeURIComponent(publishedVideoTitle)}&tab=video`);
    await expect
      .poll(
        async () => {
          const response = await page.request.get('/api/v1/search/all', {
            params: { keyword: publishedVideoTitle, tab: 'video', page: 1, pageSize: 20 },
          });
          const payload = await response.json();
          return payload.data?.video?.some(
            (item: { title?: string }) => item.title === publishedVideoTitle,
          );
        },
        { timeout: 20_000, message: 'approved video did not reach the public search index' },
      )
      .toBe(true);
    const refreshedSearchResponse = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return (
        response.request().method() === 'GET' &&
        url.pathname === '/api/v1/search/all' &&
        url.searchParams.get('keyword') === publishedVideoTitle
      );
    });
    await page.getByRole('button', { name: '刷新视频', exact: true }).click();
    expect((await refreshedSearchResponse).status()).toBe(200);
    const publishedLink = page
      .locator('[data-tour="search-results"]')
      .locator('a.title-link')
      .filter({ hasText: publishedVideoTitle })
      .first();
    await expect(publishedLink).toBeVisible();
    const href = await publishedLink.getAttribute('href');
    const match = href?.match(/\/video\/(\d+)$/);
    expect(match, `published video link is invalid: ${href}`).toBeTruthy();
    publishedVideoId = Number(match?.[1]);
  });

  test('UC02 searches, opens, plays, and finds the video in browser watch history', async ({ page }) => {
    expect(publishedVideoId).toBeGreaterThan(0);
    await setBrowserSession(page, {
      token: actorToken,
      userId: actorUserId,
      nickname: updatedActorNickname,
      role: 'user',
    });
    await page.goto('/');

    const searchInput = page.getByPlaceholder('搜索视频、UP主或内容');
    await searchInput.fill(publishedVideoTitle);
    await searchInput.press('Enter');
    await expect(page).toHaveURL(/\/search\?.*tab=video/);
    await page
      .locator('[data-tour="search-results"]')
      .getByRole('link', { name: publishedVideoTitle, exact: true })
      .first()
      .click();

    await expect(page).toHaveURL(new RegExp(`/video/${publishedVideoId}$`));
    await expect(page.getByRole('heading', { level: 1, name: publishedVideoTitle })).toBeVisible();
    const playResponse = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.url().endsWith(`/api/v1/videos/${publishedVideoId}/play`),
    );
    await page.locator('video').dispatchEvent('play');
    expect((await playResponse).status()).toBe(200);

    await page.goto('/user/dashboard');
    await page.getByRole('button', { name: '历史记录', exact: true }).click();
    await expect(page.getByRole('heading', { name: publishedVideoTitle })).toBeVisible();
  });

  test('UC04 likes, favorites, comments, sends danmaku, follows, and emits notifications', async ({
    page,
  }) => {
    await setBrowserSession(page, {
      token: actorToken,
      userId: actorUserId,
      nickname: updatedActorNickname,
      role: 'user',
    });
    await page.goto(`/video/${publishedVideoId}`);

    const followResponse = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.url().endsWith(`/api/v1/users/${creatorUserId}/follow`),
    );
    await page.getByRole('button', { name: '+ 关注', exact: true }).click();
    expect((await followResponse).status()).toBe(200);
    await expect(page.getByRole('button', { name: '已关注', exact: true })).toBeVisible();

    const likeResponse = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.url().endsWith(`/api/v1/videos/${publishedVideoId}/like`),
    );
    await page.getByRole('button', { name: /^赞(?:\s|$)/ }).click();
    expect((await likeResponse).status()).toBe(200);

    await page.getByRole('button', { name: /^收藏(?:\s|$)/ }).click();
    const favoriteDialog = page.getByRole('dialog', { name: '选择收藏夹' });
    await expect(favoriteDialog).toBeVisible();
    await favoriteDialog.locator('.favorite-dialog-item').first().click();
    const favoriteResponse = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.url().endsWith(`/api/v1/videos/${publishedVideoId}/favorite`),
    );
    await favoriteDialog.getByRole('button', { name: '确认收藏', exact: true }).click();
    expect((await favoriteResponse).status()).toBe(200);

    const commentText = `UC04 浏览器评论 ${runId}`;
    await page.getByPlaceholder('发一条友善的评论......').fill(commentText);
    const commentResponse = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.url().endsWith(`/api/v1/videos/${publishedVideoId}/comments`),
    );
    await page.getByRole('button', { name: '发表评论', exact: true }).click();
    expect((await commentResponse).status()).toBe(200);
    await expect(page.getByText(commentText, { exact: true })).toBeVisible();

    const danmakuText = `UC04 弹幕 ${runId}`;
    await page.getByPlaceholder('发个友善的弹幕见证当下').fill(danmakuText);
    const danmakuResponse = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.url().endsWith(`/api/v1/videos/${publishedVideoId}/danmaku`),
    );
    await page.locator('.danmaku-send').click();
    expect((await danmakuResponse).status()).toBe(200);

    await setBrowserSession(page, {
      token: creatorToken,
      userId: creatorUserId,
      nickname: '中文用户',
      role: 'user',
    });
    await page.goto('/');
    await expect
      .poll(
        async () =>
          page.evaluate(
            async ({ token, expectedActorId }) => {
              const response = await fetch('/api/v1/notifications', {
                headers: { authorization: `Bearer ${token}` },
              });
              if (!response.ok) return [`HTTP_${response.status}`];
              const payload = await response.json();
              return payload.data
                .filter((item: { actorId?: number }) => item.actorId === expectedActorId)
                .map((item: { type: string }) => item.type);
            },
            { token: creatorToken, expectedActorId: actorUserId },
          ),
        { timeout: 15_000, message: 'UC04 notifications did not drain from the content outbox' },
      )
      .toEqual(expect.arrayContaining(['FOLLOW', 'LIKE', 'FAVORITE', 'COMMENT']));
  });

  test('UC05 starts a live room, persists chat, stops, and saves a replay draft', async ({
    page,
    request,
  }, testInfo) => {
    await setBrowserSession(page, {
      token: creatorToken,
      userId: creatorUserId,
      nickname: '中文用户',
      role: 'user',
    });
    await installBrowserMediaFakes(page);

    const replayFilename = `uc05-full-${runId}.mp4`;
    const mediaPath = testInfo.outputPath(replayFilename);
    execFileSync(
      ffmpegPath,
      [
        '-y',
        '-f',
        'lavfi',
        '-i',
        'color=c=green:s=32x32:d=0.2',
        '-c:v',
        'libx264',
        '-pix_fmt',
        'yuv420p',
        '-movflags',
        '+faststart',
        mediaPath,
      ],
      { stdio: 'ignore' },
    );
    const upload = await request.post('/api/v1/videos/upload?assetType=RECORDING', {
      headers: { authorization: `Bearer ${creatorToken}` },
      multipart: {
        file: {
          name: replayFilename,
          mimeType: 'video/mp4',
          buffer: readFileSync(mediaPath),
        },
      },
    });
    expect(upload.status()).toBe(200);
    const uploaded = (await upload.json()).data;

    await page.route('**/api/v1/videos/upload?assetType=RECORDING', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: uploaded }),
      });
    });

    await page.goto('/live');
    await expect(page.getByRole('heading', { name: '直播', exact: true })).toBeVisible();
    await page.locator('.live-settings input').first().fill(`UC05 浏览器回归 ${runId}`);
    await page.getByRole('button', { name: '准备预览', exact: true }).first().click();
    const startResponse = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        /\/api\/v1\/lives\/rooms\/\d+\/start$/.test(response.url()),
    );
    await page.getByRole('button', { name: '立即开播', exact: true }).click();
    expect((await startResponse).headers()['x-gateway-upstream']).toBe('live-reward');
    await expect(page.locator('.tag-live')).toHaveText('直播中');

    const messageText = `UC05 浏览器弹幕 ${runId}`;
    await page.getByPlaceholder('发一条弹幕，按回车发送').fill(messageText);
    const messageResponse = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        /\/api\/v1\/lives\/rooms\/\d+\/messages$/.test(response.url()),
    );
    await page.getByRole('button', { name: '发送', exact: true }).click();
    expect((await messageResponse).headers()['x-gateway-upstream']).toBe('live-reward');
    await expect(page.locator('.message-list .message-item p').filter({ hasText: messageText })).toBeVisible();

    const stopResponse = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        /\/api\/v1\/lives\/rooms\/\d+\/stop$/.test(response.url()),
    );
    await page.getByRole('button', { name: '结束直播', exact: true }).click();
    expect((await stopResponse).headers()['x-gateway-upstream']).toBe('live-reward');
    await expect(page.getByRole('dialog', { name: '保存直播内容' })).toBeVisible();

    const replayResponse = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        /\/api\/v1\/lives\/rooms\/\d+\/replay$/.test(response.url()),
    );
    await page
      .getByRole('dialog', { name: '保存直播内容' })
      .getByRole('button', { name: '保存为稿件', exact: true })
      .click();
    expect((await replayResponse).status()).toBe(200);
    await expect(page.getByText('录播已保存为稿件，可在用户中心继续编辑', { exact: true })).toBeVisible();
  });

  test('UC06 reports and resolves a video through the user and admin browser interfaces', async ({
    page,
  }) => {
    await setBrowserSession(page, {
      token: actorToken,
      userId: actorUserId,
      nickname: updatedActorNickname,
      role: 'user',
    });
    await page.goto(`/video/${publishedVideoId}`);
    await page.locator('.report-action').click();
    const reportDialog = page.getByRole('dialog', { name: '举报视频' });
    await reportDialog.getByPlaceholder('请输入举报原因（2-255字）').fill(reportReason);
    const reportResponse = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' && response.url().endsWith('/api/v1/reports'),
    );
    await reportDialog.getByRole('button', { name: '提交举报', exact: true }).click();
    expect((await reportResponse).status()).toBe(200);
    await expect(page.getByText('视频举报已提交，管理员将会审核', { exact: true })).toBeVisible();

    await setBrowserSession(page, {
      token: adminToken,
      userId: adminUserId,
      nickname: '中文管理员',
      role: 'admin',
    });
    await page.goto('/admin/dashboard');
    const reportCard = page.locator('.review-card').filter({ hasText: reportReason }).first();
    await expect(reportCard).toBeVisible();
    const handleResponse = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        /\/api\/v1\/admin\/reports\/\d+$/.test(response.url()),
    );
    await reportCard.getByRole('button', { name: '保留', exact: true }).click();
    expect((await handleResponse).status()).toBe(200);
    await expect(reportCard.locator('.el-tag').getByText('已处理', { exact: true })).toBeVisible();

    await setBrowserSession(page, {
      token: actorToken,
      userId: actorUserId,
      nickname: updatedActorNickname,
      role: 'user',
    });
    await page.goto('/');
    await expect
      .poll(
        async () =>
          page.evaluate(
            async ({ token, recipientId }) => {
              const response = await fetch('/api/v1/notifications', {
                headers: { authorization: `Bearer ${token}` },
              });
              if (!response.ok) return false;
              const payload = await response.json();
              return payload.data.some(
                (item: { recipientId?: number; type?: string }) =>
                  item.recipientId === recipientId && item.type === 'REPORT',
              );
            },
            { token: actorToken, recipientId: actorUserId },
          ),
        { timeout: 15_000, message: 'UC06 REPORT notification was not delivered' },
      )
      .toBe(true);
  });
});

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required for services-mode browser regression; the suite must not skip`);
  }
  return value;
}

async function readBrowserSession(page: Page) {
  return page.evaluate(() => ({
    token: localStorage.getItem('vp_token') || '',
    userId: Number(localStorage.getItem('vp_user_id') || 0),
  }));
}

async function setBrowserSession(
  page: Page,
  session: { token: string; userId: number; nickname: string; role: 'admin' | 'user' },
) {
  await page.goto('/');
  await page.evaluate((nextSession) => {
    localStorage.setItem('vp_token', nextSession.token);
    localStorage.setItem('vp_user_id', String(nextSession.userId));
    localStorage.setItem('vp_role', nextSession.role);
    localStorage.setItem('vp_nickname', nextSession.nickname);
  }, session);
}

async function installBrowserMediaFakes(page: Page) {
  await page.addInitScript(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext('2d');
    if (context) {
      context.fillStyle = '#2563eb';
      context.fillRect(0, 0, 64, 64);
    }
    const stream = canvas.captureStream(5);
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: async () => stream, getDisplayMedia: async () => stream },
    });
    Object.defineProperty(HTMLMediaElement.prototype, 'play', {
      configurable: true,
      value: async () => undefined,
    });

    class FakeMediaRecorder extends EventTarget {
      readonly mimeType = 'video/webm';
      state: 'inactive' | 'recording' = 'inactive';

      constructor(readonly stream: MediaStream) {
        super();
      }

      static isTypeSupported(type: string) {
        return type.startsWith('video/webm');
      }

      start() {
        this.state = 'recording';
      }

      stop() {
        this.state = 'inactive';
        this.dispatchEvent(
          new BlobEvent('dataavailable', {
            data: new Blob(['browser-recording'], { type: this.mimeType }),
          }),
        );
        this.dispatchEvent(new Event('stop'));
      }
    }

    Object.defineProperty(window, 'MediaRecorder', {
      configurable: true,
      value: FakeMediaRecorder,
    });
  });
}
