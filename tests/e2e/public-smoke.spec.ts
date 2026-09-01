import { expect, test, type APIRequestContext } from '@playwright/test';

const seededVideo = {
  title: '观澜视频平台演示视频',
  description: '用于展示首页推荐、搜索筛选、详情页互动和上传链路的综合演示视频。',
};

interface PublicVideoSummary {
  id: number;
  title: string;
}

interface PublicSearchPayload {
  code: number;
  data: {
    keyword: string;
    counts: {
      video: number;
    };
    video: PublicVideoSummary[];
  };
}

interface PublicVideoDetailPayload {
  code: number;
  data: {
    id: number;
    title: string;
    description: string;
    status: string;
  };
}

async function fetchSeededVideo(request: APIRequestContext) {
  const response = await request.get('/api/v1/search/all', {
    params: {
      keyword: seededVideo.title,
      tab: 'video',
      page: 1,
      pageSize: 20,
    },
  });

  expect(response.ok()).toBe(true);
  const payload = (await response.json()) as PublicSearchPayload;
  expect(payload).toMatchObject({
    code: 0,
    data: {
      keyword: seededVideo.title,
    },
  });

  const video = payload.data.video.find((item) => item.title === seededVideo.title);
  expect(video, 'seeded published video is absent from search results').toBeDefined();
  return video!;
}

test('public homepage renders the VideoPlayer application shell', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/观澜视频平台/);
  await expect(page.locator('#app')).toBeVisible();
});

test('frontend proxy exposes the backend health contract', async ({ request }) => {
  const response = await request.get('/api/v1/health');

  expect(response.ok()).toBe(true);
  await expect(response.json()).resolves.toEqual({
    code: 0,
    message: 'ok',
    data: {
      status: 'ok',
      service: 'backend',
    },
  });
});

test('newly registered user lands on a populated homepage feed', async ({ page }) => {
  const suffix = Date.now().toString(36);
  const username = `e2e_home_${suffix}`;

  await page.goto('/register');
  await page.getByLabel('用户名').fill(username);
  await page.getByLabel('密码').fill('Test123456!');
  await page.getByLabel('昵称（可选）').fill(`首页回归${suffix}`);
  await page.getByRole('button', { name: '注册' }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText('加载推荐流失败')).toHaveCount(0);
  await expect(page.locator('[data-tour="home-recommend-list"]')).toBeVisible();
  await expect(page.locator('[data-tour="home-recommend-list"] a').first()).toBeVisible();
});

test('public search returns the seeded published video', async ({ page }) => {
  const searchResponsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return (
      response.request().method() === 'GET' &&
      url.pathname === '/api/v1/search/all' &&
      url.searchParams.get('keyword') === seededVideo.title
    );
  });

  await page.goto(`/search?keyword=${encodeURIComponent(seededVideo.title)}&tab=video`);

  const searchResponse = await searchResponsePromise;
  expect(searchResponse.ok()).toBe(true);
  const payload = (await searchResponse.json()) as PublicSearchPayload;
  expect(payload).toMatchObject({
    code: 0,
    data: {
      keyword: seededVideo.title,
    },
  });
  expect(payload.data.counts.video).toBeGreaterThan(0);
  expect(payload.data.video).toEqual(
    expect.arrayContaining([expect.objectContaining({ title: seededVideo.title })]),
  );

  const results = page.locator('[data-tour="search-results"]');
  await expect(results).toBeVisible();
  await expect(results.getByRole('link', { name: seededVideo.title, exact: true }).first()).toBeVisible();
  await expect(page.getByText('搜索失败，请稍后重试')).toHaveCount(0);
});

test('public video detail renders the selected published video contract', async ({ page, request }) => {
  const video = await fetchSeededVideo(request);
  const detailResponsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return response.request().method() === 'GET' && url.pathname === `/api/v1/videos/${video.id}`;
  });

  await page.goto(`/video/${video.id}`, { waitUntil: 'domcontentloaded' });

  const detailResponse = await detailResponsePromise;
  expect(detailResponse.ok()).toBe(true);
  const payload = (await detailResponse.json()) as PublicVideoDetailPayload;
  expect(payload).toMatchObject({
    code: 0,
    data: {
      id: video.id,
      title: seededVideo.title,
      description: seededVideo.description,
      status: 'PUBLISHED',
    },
  });

  await expect(page).toHaveURL(new RegExp(`/video/${video.id}$`));
  await expect(page.getByRole('heading', { level: 1, name: seededVideo.title })).toBeVisible();
  await expect(page.locator('[data-tour="video-player"]')).toBeVisible();
  await expect(page.getByText(seededVideo.description, { exact: true })).toBeVisible();
  await expect(page.getByText('加载视频详情失败')).toHaveCount(0);
});
