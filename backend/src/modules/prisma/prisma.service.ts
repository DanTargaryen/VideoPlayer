import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import {
  getPrismaErrorCode,
  isTransientPrismaError,
} from '../../common/prisma/transient-prisma-error';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    await this.$connect();
  }

  async runWithTransientRetry<T>(
    operation: () => Promise<T>,
    options: { operationName?: string; retries?: number; delayMs?: number } = {},
  ) {
    const retries = options.retries ?? 1;
    const delayMs = options.delayMs ?? 80;

    for (let attempt = 0; ; attempt += 1) {
      try {
        return await operation();
      } catch (error) {
        if (!isTransientPrismaError(error) || attempt >= retries) {
          throw error;
        }

        const operationName = options.operationName ?? 'prisma operation';
        const code = getPrismaErrorCode(error) ?? 'TRANSIENT';
        this.logger.warn(`${operationName} failed with ${code}, retrying once`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
}
