import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import * as ts from 'typescript';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import request = require('supertest');

import { AppModule } from '../src/app.module';
import { PrismaExceptionFilter } from '../src/common/filters/prisma-exception.filter';
import { CommentAiWorkerService } from '../src/modules/comment-ai/comment-ai.worker';
import { GrokBotService } from '../src/modules/comment-ai/grok-bot.service';

jest.setTimeout(30_000);

type HttpMethod = 'DELETE' | 'GET' | 'PATCH' | 'POST' | 'PUT';

type PublicRoute = {
  controllerFile: string;
  handler: string;
  method: HttpMethod;
  path: string;
};

type RouteResult = PublicRoute & {
  requestPath: string;
  status: number;
};

const rootDirectory = resolve(__dirname, '..', '..');
const controllerDirectory = join(rootDirectory, 'backend', 'src', 'modules');
const evidenceFile = join(rootDirectory, 'test-results', 'public-api-route-coverage.json');
const publicRoutes = discoverPublicRoutes(controllerDirectory);

describe('Public Controller route coverage', () => {
  let app: INestApplication;
  const routeResults: RouteResult[] = [];
  const originalEnvironment = {
    DATABASE_URL: process.env.DATABASE_URL,
    STORAGE_BACKEND: process.env.STORAGE_BACKEND,
    SRS_API_BASE: process.env.SRS_API_BASE,
    GROK_BOT_USERNAME: process.env.GROK_BOT_USERNAME,
  };

  beforeAll(async () => {
    const integrationDatabaseUrl = process.env.INTEGRATION_DATABASE_URL;
    if (!integrationDatabaseUrl) {
      throw new Error('INTEGRATION_DATABASE_URL is required for the public route coverage suite');
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
    process.env.GROK_BOT_USERNAME = 'public_route_coverage_disabled_bot';

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
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
  });

  afterAll(async () => {
    mkdirSync(dirname(evidenceFile), { recursive: true });
    const coveredRouteKeys = new Set(
      routeResults.map((route) => `${route.method} ${route.path}`),
    );
    writeFileSync(
      evidenceFile,
      `${JSON.stringify(
        {
          schemaVersion: 'public-api-route-coverage/v1',
          generatedAt: new Date().toISOString(),
          discoveredRoutes: publicRoutes.length,
          exercisedRoutes: coveredRouteKeys.size,
          complete: coveredRouteKeys.size === publicRoutes.length,
          routes: routeResults,
        },
        null,
        2,
      )}\n`,
      'utf8',
    );

    if (app) {
      await app.close();
    }
    restoreEnvironment('DATABASE_URL', originalEnvironment.DATABASE_URL);
    restoreEnvironment('STORAGE_BACKEND', originalEnvironment.STORAGE_BACKEND);
    restoreEnvironment('SRS_API_BASE', originalEnvironment.SRS_API_BASE);
    restoreEnvironment('GROK_BOT_USERNAME', originalEnvironment.GROK_BOT_USERNAME);
  });

  it('discovers a unique, non-empty Controller route inventory', () => {
    const routeKeys = publicRoutes.map((route) => `${route.method} ${route.path}`);

    expect(publicRoutes.length).toBeGreaterThan(0);
    expect(new Set(routeKeys).size).toBe(routeKeys.length);
  });

  it.each(publicRoutes)('$method $path reaches $handler', async (route) => {
    const requestPath = materializeRoutePath(route.path);
    const response = await sendRouteProbe(app, route.method, requestPath);
    const responseMessage = extractResponseMessage(response.body);

    routeResults.push({ ...route, requestPath, status: response.status });

    expect(response.status).toBeLessThan(500);
    expect(responseMessage).not.toMatch(/^Cannot (DELETE|GET|PATCH|POST|PUT) /);
  });
});

function discoverPublicRoutes(directory: string): PublicRoute[] {
  const routes: PublicRoute[] = [];

  for (const controllerFile of listControllerFiles(directory)) {
    const sourceText = readFileSync(controllerFile, 'utf8');
    const source = ts.createSourceFile(
      controllerFile,
      sourceText,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );

    for (const statement of source.statements) {
      if (!ts.isClassDeclaration(statement)) continue;

      const controllerDecorator = getDecorators(statement).find(
        (decorator) => decoratorName(decorator, source) === 'Controller',
      );
      if (!controllerDecorator) continue;

      const controllerPath = decoratorPath(controllerDecorator);
      for (const member of statement.members) {
        if (!ts.isMethodDeclaration(member)) continue;

        for (const decorator of getDecorators(member)) {
          const method = decoratorName(decorator, source).toUpperCase() as HttpMethod;
          if (!['DELETE', 'GET', 'PATCH', 'POST', 'PUT'].includes(method)) continue;

          routes.push({
            controllerFile: relative(rootDirectory, controllerFile),
            handler: member.name.getText(source),
            method,
            path: normalizeRoutePath('/api/v1', controllerPath, decoratorPath(decorator)),
          });
        }
      }
    }
  }

  return routes.sort((left, right) =>
    `${left.path} ${left.method}`.localeCompare(`${right.path} ${right.method}`),
  );
}

function listControllerFiles(directory: string): string[] {
  const files: string[] = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...listControllerFiles(entryPath));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.controller.ts')) {
      files.push(entryPath);
    }
  }

  return files.sort();
}

function getDecorators(node: ts.Node): readonly ts.Decorator[] {
  return ts.canHaveDecorators(node) ? (ts.getDecorators(node) ?? []) : [];
}

function decoratorName(decorator: ts.Decorator, source: ts.SourceFile): string {
  const expression = decorator.expression;
  if (!ts.isCallExpression(expression)) return '';
  return expression.expression.getText(source);
}

function decoratorPath(decorator: ts.Decorator): string {
  const expression = decorator.expression;
  if (!ts.isCallExpression(expression)) return '';
  const [firstArgument] = expression.arguments;
  if (!firstArgument) return '';
  if (!ts.isStringLiteralLike(firstArgument)) {
    throw new Error(`Route decorators must use a literal path: ${firstArgument.getText()}`);
  }
  return firstArgument.text;
}

function normalizeRoutePath(...parts: string[]): string {
  return `/${parts
    .flatMap((part) => part.split('/'))
    .map((part) => part.trim())
    .filter(Boolean)
    .join('/')}`;
}

function materializeRoutePath(routePath: string): string {
  const substitutions: Record<string, string> = {
    code: 'tech',
    targetType: 'COMMENT',
  };

  return routePath.replace(/:([A-Za-z0-9_]+)/g, (_match, parameter: string) => {
    return substitutions[parameter] ?? '999999999';
  });
}

async function sendRouteProbe(
  app: INestApplication,
  method: HttpMethod,
  requestPath: string,
) {
  const agent = request(app.getHttpServer());
  const lowerMethod = method.toLowerCase() as 'delete' | 'get' | 'patch' | 'post' | 'put';
  const probe = agent[lowerMethod](requestPath).set('Accept', 'application/json');

  if (['PATCH', 'POST', 'PUT'].includes(method)) {
    probe.set('Content-Type', 'application/json').send({});
  }

  return probe;
}

function extractResponseMessage(body: unknown): string {
  if (!body || typeof body !== 'object' || !('message' in body)) return '';
  const message = (body as { message?: unknown }).message;
  if (Array.isArray(message)) return message.join(' ');
  return typeof message === 'string' ? message : '';
}

function restoreEnvironment(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
    return;
  }
  process.env[name] = value;
}
