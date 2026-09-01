import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir, rm } from 'node:fs/promises';
import * as path from 'node:path';
import { promisify } from 'node:util';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import request = require('supertest');

import { AppModule } from '../src/app.module';
import { PrismaExceptionFilter } from '../src/common/filters/prisma-exception.filter';
import { findWorkingBinary, getBinaryCandidates } from '../src/common/utils/ffmpeg-binary';
import { CommentAiWorkerService } from '../src/modules/comment-ai/comment-ai.worker';
import { GrokBotService } from '../src/modules/comment-ai/grok-bot.service';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { LOCAL_STORAGE_ROOT } from '../src/modules/storage/minio.service';

const execFileAsync = promisify(execFile);

jest.setTimeout(360_000);

type LoginSession = {
  token: string;
  userId: number;
};

type CommentAiTaskRecord = {
  id: number;
  commentId: number;
  prompt: string;
  status: string;
};

describe('Agent/AI real external API suite', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let session: LoginSession;
  let userId: number | undefined;
  let videoId: number | undefined;
  let assetId: number | undefined;
  let commentId: number | undefined;

  const runId = randomUUID();
  const username = `agent_ai_it_${runId}`;
  const email = `${username}@local.invalid`;
  const password = 'AgentAiTest123!';
  const disabledBotUsername = `agent_ai_bot_${runId}`;
  const objectKey = `agent-ai-tests/${runId}/blue-sample.mp4`;
  const localVideoPath = path.join(LOCAL_STORAGE_ROOT, objectKey);
  const originalEnvironment = {
    DATABASE_URL: process.env.DATABASE_URL,
    STORAGE_BACKEND: process.env.STORAGE_BACKEND,
    GROK_BOT_USERNAME: process.env.GROK_BOT_USERNAME,
  };

  const authorization = () => ({ Authorization: `Bearer ${session.token}` });

  beforeAll(async () => {
    const integrationDatabaseUrl = process.env.INTEGRATION_DATABASE_URL;
    if (!integrationDatabaseUrl) {
      throw new Error('INTEGRATION_DATABASE_URL is required for the Agent/AI suite');
    }
    if (process.env.ALLOW_REAL_AI_CALLS !== 'true') {
      throw new Error('Real model calls require ALLOW_REAL_AI_CALLS=true');
    }
    if (!process.env.DASHSCOPE_API_KEY?.trim()) {
      throw new Error('DASHSCOPE_API_KEY is required for the Agent/AI suite');
    }
    const dashscopeBaseUrl = new URL(
      process.env.DASHSCOPE_BASE_URL?.trim() ||
        'https://dashscope.aliyuncs.com/compatible-mode/v1',
    );
    if (dashscopeBaseUrl.protocol !== 'https:' || dashscopeBaseUrl.hostname !== 'dashscope.aliyuncs.com') {
      throw new Error(
        'Real model verification requires the official HTTPS endpoint at dashscope.aliyuncs.com',
      );
    }

    const parsedDatabaseUrl = new URL(integrationDatabaseUrl);
    const isLocalHost = ['127.0.0.1', 'localhost'].includes(parsedDatabaseUrl.hostname);
    const isTestDatabase = parsedDatabaseUrl.pathname.toLowerCase().includes('test');
    if ((!isLocalHost || !isTestDatabase) && process.env.ALLOW_REMOTE_INTEGRATION_DATABASE !== 'true') {
      throw new Error(
        'Non-local or shared integration databases require ALLOW_REMOTE_INTEGRATION_DATABASE=true',
      );
    }
    const ffmpegBinary = await findWorkingBinary(getBinaryCandidates('FFMPEG_PATH', 'ffmpeg'));
    if (!ffmpegBinary) {
      throw new Error('No working FFmpeg binary was found');
    }

    process.env.DATABASE_URL = integrationDatabaseUrl;
    process.env.STORAGE_BACKEND = 'local';
    process.env.GROK_BOT_USERNAME = disabledBotUsername;

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(CommentAiWorkerService)
      .useValue({ onModuleInit: () => undefined, onModuleDestroy: () => undefined })
      .overrideProvider(GrokBotService)
      .useValue({
        onModuleInit: () => undefined,
        getBotUser: async () => ({
          id: -1,
          username: disabledBotUsername,
          nickname: 'Disabled Agent/AI test bot',
          avatarUrl: null,
        }),
        isBotUser: () => false,
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalFilters(new PrismaExceptionFilter());
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    await app.init();
    prisma = app.get(PrismaService);

    const user = await prisma.user.create({
      data: {
        username,
        email,
        password,
        role: 'USER',
        nickname: 'Agent AI 集成测试用户',
      },
    });
    userId = user.id;

    await mkdir(path.dirname(localVideoPath), { recursive: true });
    await execFileAsync(ffmpegBinary, [
      '-y',
      '-f',
      'lavfi',
      '-i',
      'color=c=blue:s=320x180:d=4:r=2',
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      localVideoPath,
    ]);

    const video = await prisma.video.create({
      data: {
        creatorId: user.id,
        title: `Agent AI blue sample ${runId}`,
        description: 'A short blue test video generated for real multimodal API verification.',
        category: 'tech',
        coverUrl: '/test/agent-ai-blue-cover.jpg',
        playUrl: `/storage/${objectKey}`,
        status: 'PUBLISHED',
        uploadToken: objectKey,
        publishedAt: new Date(),
        categories: { create: { code: 'tech' } },
      },
    });
    videoId = video.id;

    const asset = await prisma.videoAsset.create({
      data: {
        videoId: video.id,
        assetType: 'ORIGINAL',
        objectKey,
        bucket: 'video-player',
        mimeType: 'video/mp4',
        originalName: 'blue-sample.mp4',
        fileSize: 1,
        url: `/storage/${objectKey}`,
      },
    });
    assetId = asset.id;

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ account: username, password })
      .expect(201);
    session = login.body.data as LoginSession;
  });

  afterAll(async () => {
    try {
      if (prisma) {
        if (videoId !== undefined) {
          await prisma.commentAiTask.deleteMany({ where: { videoId } });
          await prisma.comment.deleteMany({ where: { videoId } });
          await prisma.videoAiChatSession.deleteMany({ where: { videoId } });
          await prisma.videoAiSummary.deleteMany({ where: { videoId } });
          await prisma.videoCategory.deleteMany({ where: { videoId } });
        }
        if (assetId !== undefined) {
          await prisma.videoAsset.deleteMany({ where: { id: assetId } });
        }
        if (videoId !== undefined) {
          await prisma.video.deleteMany({ where: { id: videoId } });
        }
        if (userId !== undefined) {
          await prisma.favoriteFolder.deleteMany({ where: { userId } });
          await prisma.user.deleteMany({ where: { id: userId } });
        }
        await prisma.user.deleteMany({ where: { username: disabledBotUsername } });
      }
    } finally {
      try {
        await rm(path.join(LOCAL_STORAGE_ROOT, 'agent-ai-tests', runId), { recursive: true, force: true });
      } finally {
        try {
          if (app) {
            await app.close();
          }
        } finally {
          restoreEnvironment('DATABASE_URL', originalEnvironment.DATABASE_URL);
          restoreEnvironment('STORAGE_BACKEND', originalEnvironment.STORAGE_BACKEND);
          restoreEnvironment('GROK_BOT_USERNAME', originalEnvironment.GROK_BOT_USERNAME);
        }
      }
    }
  });

  it('AGENT-AI-001 [implemented/local] exposes structured site help through the assistant API', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/assistant/chat')
      .send({ message: '如何上传视频？' })
      .expect(201);

    expect(response.body).toMatchObject({
      code: 0,
      data: {
        mode: 'site-help',
        source: 'knowledge',
        model: 'local-structured-knowledge',
        reply: expect.any(String),
      },
    });
    expect(response.body.data.reply.length).toBeGreaterThan(20);
  });

  it('AGENT-AI-002 [implemented/external] calls the real model through the assistant API', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/assistant/chat')
      .send({ message: `请用一句中文解释彩虹形成的原因，并以测试标识 ${runId} 结束。` })
      .expect(201);

    expect(response.body).toMatchObject({
      code: 0,
      data: {
        mode: 'chat',
        source: 'model',
        model: expect.any(String),
        reply: expect.any(String),
      },
    });
    expect(response.body.data.model.length).toBeGreaterThan(0);
    expect(response.body.data.reply.length).toBeGreaterThan(0);
  });

  it('AGENT-AI-003 [implemented/external] summarizes a local video through the real multimodal API', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/ai/video-summary')
      .send({ videoId })
      .expect(201);

    expect(response.body).toMatchObject({
      code: 0,
      data: {
        success: true,
        videoId,
        summary: expect.any(String),
        frameCount: expect.any(Number),
        cached: false,
      },
    });
    expect(response.body.data.summary.length).toBeGreaterThan(0);
    expect(response.body.data.frameCount).toBeGreaterThan(0);

    const persisted = await prisma.videoAiSummary.findUnique({ where: { videoId: videoId! } });
    expect(persisted).toMatchObject({
      videoId,
      summary: response.body.data.summary,
      frameCount: response.body.data.frameCount,
      model: expect.any(String),
    });
    expect(persisted?.model.length).toBeGreaterThan(0);
  });

  it('AGENT-AI-004 [implemented/external] chats about the video and persists API history', async () => {
    const chat = await request(app.getHttpServer())
      .post('/api/v1/ai/video-chat')
      .set(authorization())
      .send({ videoId, prompt: '这个测试视频的主要画面颜色是什么？请简短回答。' })
      .expect(201);

    expect(chat.body).toMatchObject({
      code: 0,
      data: {
        success: true,
        videoId,
        reply: expect.any(String),
        model: expect.any(String),
        frameCount: expect.any(Number),
        userMessageId: expect.any(Number),
        assistantMessageId: expect.any(Number),
      },
    });
    expect(chat.body.data.reply.length).toBeGreaterThan(0);

    const history = await request(app.getHttpServer())
      .get(`/api/v1/ai/video-chat/${videoId}`)
      .set(authorization())
      .expect(200);

    expect(history.body).toMatchObject({
      code: 0,
      data: {
        success: true,
        videoId,
        messages: [
          expect.objectContaining({ role: 'user', content: '这个测试视频的主要画面颜色是什么？请简短回答。' }),
          expect.objectContaining({ role: 'assistant', model: chat.body.data.model }),
        ],
      },
    });
  });

  it('AGENT-AI-005 [implemented/isolated] accepts @grok through the comment API and queues only this task', async () => {
    const content = `@grok 请概括这个蓝色视频，测试标识 ${runId}`;
    const response = await request(app.getHttpServer())
      .post(`/api/v1/videos/${videoId}/comments`)
      .set(authorization())
      .send({ content })
      .expect(201);

    expect(response.body).toMatchObject({
      code: 0,
      data: { id: expect.any(Number), content },
    });
    commentId = response.body.data.id as number;

    const task = await waitForOwnCommentTask(prisma, commentId);
    expect(task).toMatchObject({
      commentId,
      prompt: `请概括这个蓝色视频，测试标识 ${runId}`,
      status: 'PENDING',
    });
  });
});

async function waitForOwnCommentTask(prisma: PrismaService, commentId: number) {
  const deadline = Date.now() + 30_000;

  while (Date.now() < deadline) {
    const task = (await prisma.commentAiTask.findUnique({
      where: { commentId },
      select: { id: true, commentId: true, prompt: true, status: true },
    })) as CommentAiTaskRecord | null;
    if (task) {
      return task;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error(`CommentAiTask was not created for comment ${commentId}`);
}

function restoreEnvironment(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
    return;
  }
  process.env[key] = value;
}
