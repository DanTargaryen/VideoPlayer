import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';

import {
  getPrismaErrorCode,
  getPrismaErrorMessage,
  isTransientPrismaError,
} from '../prisma/transient-prisma-error';

@Catch(
  Prisma.PrismaClientKnownRequestError,
  Prisma.PrismaClientInitializationError,
  Prisma.PrismaClientUnknownRequestError,
)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const isTransient = isTransientPrismaError(exception);
    const status = isTransient ? HttpStatus.SERVICE_UNAVAILABLE : HttpStatus.INTERNAL_SERVER_ERROR;
    const message = isTransient ? '数据库连接暂时不可用，请稍后重试' : '数据库操作失败';
    const code = getPrismaErrorCode(exception) ?? 'PRISMA_ERROR';
    const detail = getPrismaErrorMessage(exception).split('\n')[0] || 'Unknown Prisma error';
    const route = `${request.method} ${request.originalUrl ?? request.url}`;
    const logMessage = `${route} -> ${code}: ${detail}`;

    if (isTransient) {
      this.logger.warn(logMessage);
    } else {
      this.logger.error(logMessage);
    }

    response.status(status).json({
      code: status,
      message,
      data: null,
    });
  }
}
