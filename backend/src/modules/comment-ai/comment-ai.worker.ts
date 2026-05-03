import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { CommentAiService } from './comment-ai.service';

@Injectable()
export class CommentAiWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CommentAiWorkerService.name);
  private timer: ReturnType<typeof setInterval> | null = null;
  private polling = false;
  private disabled = false;

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
    if (this.polling || this.disabled) {
      return;
    }

    this.polling = true;
    try {
      await this.commentAiService.processPendingTasks(this.getBatchSize());
    } catch (error) {
      if (this.isMissingCommentAiTaskTable(error)) {
        this.disabled = true;
        if (this.timer) {
          clearInterval(this.timer);
          this.timer = null;
        }
        this.logger.warn('Comment AI worker disabled because table `CommentAiTask` does not exist yet');
      } else {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Comment AI worker poll failed: ${message}`);
      }
    } finally {
      this.polling = false;
    }
  }

  private isMissingCommentAiTaskTable(error: unknown) {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const candidate = error as { code?: string; message?: string };
    if (candidate.code === 'P2021') {
      return true;
    }

    return typeof candidate.message === 'string' && candidate.message.includes('CommentAiTask');
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
