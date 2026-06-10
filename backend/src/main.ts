import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as express from 'express';

import { AppModule } from './app.module';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { getStorageMode, LOCAL_STORAGE_ROOT } from './modules/storage/minio.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: true,
  });

  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  if (getStorageMode() === 'local') {
    app.use('/storage', express.static(LOCAL_STORAGE_ROOT));
  }
  app.setGlobalPrefix('api/v1');
  app.useGlobalFilters(new PrismaExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.listen(process.env.PORT ? Number(process.env.PORT) : 3000, '0.0.0.0');
}

bootstrap();
