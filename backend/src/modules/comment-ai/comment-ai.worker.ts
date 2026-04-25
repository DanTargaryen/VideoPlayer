import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { CommentAiService } from './comment-ai.service';

@Injectable()
export class CommentAiWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CommentAiWorkerService.name);
  private timer: ReturnType<typeof setInterval> | null = null;
  private polling = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly commentAiService: CommentAiService,
  ) {}

  onModuleInit() {
    const intervalMs = this.getPollIntervalMs();
    this.timer = setInterval(() => {
      void this.pollOnce();
    }, intervalMs);

    void this.pollOnce();
    this.logger.log(`Comment AI worker started (poll interval: ${intervalMs}ms)`);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async pollOnce() {
    if (this.polling) {
      return;
    }

    this.polling = true;
    try {
      await this.commentAiService.processPendingTasks(this.getBatchSize());
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Comment AI worker poll failed: ${message}`);
    } finally {
      this.polling = false;
    }
  }

  private getPollIntervalMs() {
    const value = Number(this.configService.get<string>('COMMENT_AI_POLL_INTERVAL_MS') || 5000);
    if (!Number.isFinite(value) || value < 1000) {
      return 5000;
    }
    return Math.floor(value);
  }

  private getBatchSize() {
    const value = Number(this.configService.get<string>('COMMENT_AI_BATCH_SIZE') || 5);
    if (!Number.isFinite(value) || value < 1) {
      return 5;
    }
    return Math.floor(value);
  }
}
