import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import request = require('supertest');

import { AppModule } from '../src/app.module';
import { PrismaExceptionFilter } from '../src/common/filters/prisma-exception.filter';
import { CommentAiWorkerService } from '../src/modules/comment-ai/comment-ai.worker';
import { GrokBotService } from '../src/modules/comment-ai/grok-bot.service';
import { PrismaService } from '../src/modules/prisma/prisma.service';

jest.setTimeout(30_000);

type LoginSession = {
  token: string;
  userId: number;
  role: 'USER' | 'ADMIN';
};

describe('Integration/API acceptance suite', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let firstUser: LoginSession;
  let secondUser: LoginSession;
  let testVideoId: number;

  const runId = randomUUID();
  const firstUsername = `api_it_a_${runId}`;
  const secondUsername = `api_it_b_${runId}`;
  const registeredUsername = `api_it_registered_${runId}`;
  const disabledBotUsername = `api_it_bot_${runId}`;
  const firstEmail = `${firstUsername}@local.invalid`;
  const secondEmail = `${secondUsername}@local.invalid`;
  const registeredEmail = `${registeredUsername}@local.invalid`;
  const password = 'ApiTest123!';
  const originalEnvironment = {
    DATABASE_URL: process.env.DATABASE_URL,
    STORAGE_BACKEND: process.env.STORAGE_BACKEND,
    SRS_API_BASE: process.env.SRS_API_BASE,
    GROK_BOT_USERNAME: process.env.GROK_BOT_USERNAME,
  };

  const authorization = (session: LoginSession) => ({
    Authorization: `Bearer ${session.token}`,
  });

  beforeAll(async () => {
    const integrationDatabaseUrl = process.env.INTEGRATION_DATABASE_URL;
    if (!integrationDatabaseUrl) {
      throw new Error('INTEGRATION_DATABASE_URL is required for the integration/API suite');
    }

    const parsedDatabaseUrl = new URL(integrationDatabaseUrl);
    const isLocalHost = ['127.0.0.1', 'localhost'].includes(parsedDatabaseUrl.hostname);
    const isTestDatabase = parsedDatabaseUrl.pathname.toLowerCase().includes('test');
    const allowsRemoteDatabase = process.env.ALLOW_REMOTE_INTEGRATION_DATABASE === 'true';
    if ((!isLocalHost || !isTestDatabase) && !allowsRemoteDatabase) {
      throw new Error(
        'Non-local or shared integration databases require ALLOW_REMOTE_INTEGRATION_DATABASE=true',
      );
    }

    process.env.DATABASE_URL = integrationDatabaseUrl;
    process.env.STORAGE_BACKEND = 'local';
    process.env.SRS_API_BASE = 'http://127.0.0.1:9';
    process.env.GROK_BOT_USERNAME = disabledBotUsername;

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(CommentAiWorkerService)
      .useValue({ onModuleInit: () => undefined, onModuleDestroy: () => undefined })
      .overrideProvider(GrokBotService)
      .useValue({
        onModuleInit: () => undefined,
        getBotUser: async () => ({
          id: -1,
          username: 'disabled_test_bot',
          nickname: 'Disabled test bot',
          avatarUrl: null,
        }),
        isBotUser: () => false,
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalFilters(new PrismaExceptionFilter());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
    prisma = app.get(PrismaService);

    const [firstFixture] = await Promise.all([
      prisma.user.create({
        data: {
          username: firstUsername,
          email: firstEmail,
          password,
          role: 'USER',
          nickname: 'API 集成用户 A',
        },
      }),
      prisma.user.create({
        data: {
          username: secondUsername,
          email: secondEmail,
          password,
          role: 'USER',
          nickname: 'API 集成用户 B',
        },
      }),
    ]);
    const video = await prisma.video.create({
      data: {
        creatorId: firstFixture.id,
        title: `API integration published video ${runId}`,
        description: 'Published fixture for recommendation and search integration tests.',
        category: 'tech',
        coverUrl: '/test/cover.jpg',
        playUrl: '/test/video.mp4',
        status: 'PUBLISHED',
        uploadToken: `api-integration-${runId}`,
        publishedAt: new Date(),
        categories: { create: { code: 'tech' } },
      },
    });
    testVideoId = video.id;

    const [firstLogin, secondLogin] = await Promise.all([
      request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ account: firstUsername, password })
        .expect(201),
      request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ account: secondEmail, password })
        .expect(201),
    ]);
    firstUser = firstLogin.body.data;
    secondUser = secondLogin.body.data;
  });

  afterAll(async () => {
    try {
      if (prisma) {
        const users = await prisma.user.findMany({
          where: {
            username: { in: [firstUsername, secondUsername, registeredUsername, disabledBotUsername] },
          },
          select: { id: true },
        });
        const userIds = users.map((user: { id: number }) => user.id);

        if (userIds.length > 0) {
          await prisma.$transaction([
            prisma.directMessage.deleteMany({
              where: { OR: [{ senderId: { in: userIds } }, { recipientId: { in: userIds } }] },
            }),
            prisma.notification.deleteMany({
              where: { OR: [{ recipientId: { in: userIds } }, { actorId: { in: userIds } }] },
            }),
            prisma.followRelation.deleteMany({
              where: { OR: [{ followerId: { in: userIds } }, { followingId: { in: userIds } }] },
            }),
            prisma.creatorFollowerDaily.deleteMany({ where: { creatorId: { in: userIds } } }),
            prisma.videoCategory.deleteMany({ where: { video: { creatorId: { in: userIds } } } }),
            prisma.video.deleteMany({ where: { creatorId: { in: userIds } } }),
            prisma.favoriteFolder.deleteMany({ where: { userId: { in: userIds } } }),
            prisma.user.deleteMany({ where: { id: { in: userIds } } }),
          ]);
        }
      }
    } finally {
      if (app) {
        await app.close();
      }
      restoreEnvironment('DATABASE_URL', originalEnvironment.DATABASE_URL);
      restoreEnvironment('STORAGE_BACKEND', originalEnvironment.STORAGE_BACKEND);
      restoreEnvironment('SRS_API_BASE', originalEnvironment.SRS_API_BASE);
      restoreEnvironment('GROK_BOT_USERNAME', originalEnvironment.GROK_BOT_USERNAME);
    }
  });

  it('INT-API-001 [main] boots the complete application and exposes the health contract', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect({
        code: 0,
        message: 'ok',
        data: {
          status: 'ok',
          service: 'backend',
        },
      });

    await expect(prisma.user.findUnique({ where: { username: disabledBotUsername } })).resolves.toBeNull();
  });

  it('INT-API-002 [exception] rejects unknown request fields through the production validation pipe', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        username: `invalid_${runId}`,
        email: `invalid_${runId}@local.invalid`,
        password,
        unexpected: true,
      })
      .expect(400);

    expect(response.body.message).toContain('property unexpected should not exist');
  });

  it('INT-API-003 [exception] blocks protected APIs without a bearer token', async () => {
    const [profile, message, admin] = await Promise.all([
      request(app.getHttpServer()).put('/api/v1/users/profile').send({ nickname: 'blocked' }),
      request(app.getHttpServer()).get('/api/v1/messages/unread-count'),
      request(app.getHttpServer()).get('/api/v1/admin/dashboard'),
    ]);

    expect(profile.status).toBe(401);
    expect(message.status).toBe(401);
    expect(admin.status).toBe(401);
  });

  it('INT-API-004 [main] registers a user and persists the default favorite folder', async () => {
    const registration = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        username: registeredUsername,
        email: registeredEmail,
        password,
        nickname: 'API 注册验证用户',
      })
      .expect(201);

    expect(registration.body).toMatchObject({
      code: 0,
      message: 'ok',
      data: { username: registeredUsername, email: registeredEmail, role: 'USER' },
    });

    const persistedUser = await prisma.user.findUnique({
      where: { username: registeredUsername },
      include: { favoriteFolders: true },
    });
    expect(persistedUser?.favoriteFolders.some((folder) => folder.isDefault)).toBe(true);
  });

  it('INT-API-005 [alternate] rejects duplicate username and duplicate email independently', async () => {
    const duplicateUsername = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ username: firstUsername, email: `unique_${runId}@local.invalid`, password })
      .expect(401);
    const duplicateEmail = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ username: `unique_${runId}`, email: firstEmail, password })
      .expect(401);

    expect(duplicateUsername.body.message).toBe('Username or email already exists');
    expect(duplicateEmail.body.message).toBe('Username or email already exists');
  });

  it('INT-API-006 [exception] rejects an invalid password', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ account: firstUsername, password: 'wrong-password' })
      .expect(401);

    expect(response.body.message).toBe('Invalid username/email or password');
  });

  it('INT-API-007 [main] logs both users in and resolves bearer tokens through /auth/me', async () => {
    expect(firstUser).toMatchObject({ userId: expect.any(Number), role: 'USER' });
    expect(secondUser).toMatchObject({ userId: expect.any(Number), role: 'USER' });
    expect(firstUser.token).toMatch(/^mock-token-/);
    expect(secondUser.token).toMatch(/^mock-token-/);

    const me = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set(authorization(firstUser))
      .expect(200);
    expect(me.body).toMatchObject({
      code: 0,
      data: { id: firstUser.userId, username: firstUsername, role: 'USER' },
    });
  });

  it('INT-API-008 [main] updates a profile and reads the persisted public homepage', async () => {
    const updated = await request(app.getHttpServer())
      .put('/api/v1/users/profile')
      .set(authorization(firstUser))
      .send({ nickname: 'API 用户已更新', bio: 'integration-api-test' })
      .expect(200);
    expect(updated.body).toMatchObject({
      code: 0,
      data: { id: firstUser.userId, nickname: 'API 用户已更新', bio: 'integration-api-test' },
    });

    const homepage = await request(app.getHttpServer())
      .get(`/api/v1/users/${firstUser.userId}/homepage`)
      .expect(200);
    expect(homepage.body).toMatchObject({
      code: 0,
      data: { id: firstUser.userId, nickname: 'API 用户已更新', bio: 'integration-api-test' },
    });
  });

  it('INT-API-009 [main] reads recommendation data from the database with bounded pagination', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/feeds/recommend?page=1&pageSize=3')
      .expect(200);

    expect(response.body.code).toBe(0);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: testVideoId, status: 'PUBLISHED' })]),
    );
    expect(response.body.data.length).toBeLessThanOrEqual(3);
    expect(
      response.body.data.every((video: { status: string }) => video.status === 'PUBLISHED'),
    ).toBe(true);
  });

  it('INT-API-010 [alternate] searches users by keyword and exposes hotwords', async () => {
    const searchResponse = await request(app.getHttpServer())
      .get(`/api/v1/search/all?keyword=${encodeURIComponent(firstUsername)}&tab=user&page=1&pageSize=5`)
      .expect(200);
    const hotwordsResponse = await request(app.getHttpServer()).get('/api/v1/search/hotwords').expect(200);

    expect(searchResponse.body).toMatchObject({
      code: 0,
      data: { keyword: firstUsername, tab: 'user', page: 1, pageSize: 5 },
    });
    expect(searchResponse.body.data.user).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: firstUser.userId, username: firstUsername })]),
    );
    expect(Array.isArray(hotwordsResponse.body.data)).toBe(true);
    expect(hotwordsResponse.body.data.length).toBeGreaterThan(0);
  });

  it('INT-API-011 [main] creates a follow relation and a notification in one API workflow', async () => {
    const followed = await request(app.getHttpServer())
      .post(`/api/v1/users/${secondUser.userId}/follow`)
      .set(authorization(firstUser))
      .expect(201);
    expect(followed.body).toMatchObject({ code: 0, data: { id: secondUser.userId, followed: true } });

    const followers = await request(app.getHttpServer())
      .get(`/api/v1/users/${secondUser.userId}/followers`)
      .expect(200);
    expect(followers.body.data).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: firstUser.userId })]),
    );

    const notifications = await request(app.getHttpServer())
      .get('/api/v1/notifications')
      .set(authorization(secondUser))
      .expect(200);
    expect(notifications.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ recipientId: secondUser.userId, actorId: firstUser.userId, type: 'FOLLOW' }),
      ]),
    );
  });

  it('INT-API-012 [main] sends a direct message and clears the recipient unread count', async () => {
    const content = `integration-message-${runId}`;
    const sent = await request(app.getHttpServer())
      .post(`/api/v1/messages/conversations/${secondUser.userId}`)
      .set(authorization(firstUser))
      .send({ content })
      .expect(201);
    expect(sent.body).toMatchObject({
      code: 0,
      data: { message: { senderId: firstUser.userId, recipientId: secondUser.userId, content } },
    });

    const unreadBefore = await request(app.getHttpServer())
      .get('/api/v1/messages/unread-count')
      .set(authorization(secondUser))
      .expect(200);
    expect(unreadBefore.body.data.unreadCount).toBe(1);

    const conversation = await request(app.getHttpServer())
      .get(`/api/v1/messages/conversations/${firstUser.userId}`)
      .set(authorization(secondUser))
      .expect(200);
    expect(conversation.body.data.messages).toEqual(
      expect.arrayContaining([expect.objectContaining({ content, isRead: true, readAt: expect.any(String) })]),
    );

    const unreadAfter = await request(app.getHttpServer())
      .get('/api/v1/messages/unread-count')
      .set(authorization(secondUser))
      .expect(200);
    expect(unreadAfter.body.data.unreadCount).toBe(0);
  });

  it('INT-API-013 [main] completes the in-process live room start, viewer, chat, and stop lifecycle', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/lives/rooms')
      .set(authorization(firstUser))
      .send({ title: `API live ${runId}`, category: 'tech', sourceMode: 'camera' })
      .expect(201);
    const roomId = created.body.data.id as number;
    expect(created.body.data.status).toBe('IDLE');

    const started = await request(app.getHttpServer())
      .post(`/api/v1/lives/rooms/${roomId}/start`)
      .set(authorization(firstUser))
      .expect(201);
    expect(started.body.data.status).toBe('LIVING');

    const viewer = await request(app.getHttpServer())
      .post(`/api/v1/lives/rooms/${roomId}/viewers`)
      .expect(201);
    expect(viewer.body.data.viewerId).toBeGreaterThan(0);

    const chat = await request(app.getHttpServer())
      .post(`/api/v1/lives/rooms/${roomId}/messages`)
      .set(authorization(secondUser))
      .send({ content: '集成测试直播消息' })
      .expect(201);
    expect(chat.body.data).toMatchObject({ roomId, kind: 'CHAT', content: '集成测试直播消息' });

    const stopped = await request(app.getHttpServer())
      .post(`/api/v1/lives/rooms/${roomId}/stop`)
      .set(authorization(firstUser))
      .expect(201);
    expect(stopped.body.data.status).toBe('ENDED');
  });

  it('INT-API-014 [exception] reports SRS unavailability without crashing the application', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/lives/rooms')
      .set(authorization(firstUser))
      .send({ title: `SRS failure ${runId}`, sourceMode: 'camera' })
      .expect(201);
    const roomId = created.body.data.id as number;

    const response = await request(app.getHttpServer())
      .post(`/api/v1/lives/rooms/${roomId}/publish`)
      .set(authorization(firstUser))
      .send({ type: 'offer', sdp: 'v=0\r\n' })
      .expect(400);
    expect(response.body.message).toBe('SRS service is unavailable');

    await request(app.getHttpServer()).get('/api/v1/health').expect(200);
  });

  it('INT-API-015 [exception] blocks a normal user from the admin dashboard', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/admin/dashboard')
      .set(authorization(firstUser))
      .expect(401);

    expect(response.body.message).toBe('Admin required');
  });

  it('INT-API-016 [alternate] removes an existing or absent follow relation idempotently', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/users/${secondUser.userId}/follow`)
      .set(authorization(firstUser))
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/api/v1/users/${secondUser.userId}/follow`)
      .set(authorization(firstUser))
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({ code: 0, data: { id: secondUser.userId, followed: false } });
      });
    await request(app.getHttpServer())
      .delete(`/api/v1/users/${secondUser.userId}/follow`)
      .set(authorization(firstUser))
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({ code: 0, data: { id: secondUser.userId, followed: false } });
      });

    const followers = await request(app.getHttpServer())
      .get(`/api/v1/users/${secondUser.userId}/followers`)
      .expect(200);
    expect(followers.body.data).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: firstUser.userId })]),
    );
  });
});

function restoreEnvironment(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
    return;
  }
  process.env[name] = value;
}
