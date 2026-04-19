import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AiSummaryService } from '../ai/ai-summary.service';
import { VideoAiSummaryService } from '../ai/video-ai-summary.service';
import { PrismaService } from '../prisma/prisma.service';
import { GrokBotService } from './grok-bot.service';

const DEFAULT_MENTION_PROMPT = '请总结这个视频';
const INSUFFICIENT_REPLY = '信息不足，无法准确判断。';
const MENTION_PATTERN = /@grok\b/i;
const NON_VIDEO_PERSONAL_QUERY_PATTERN =
  /(什么时候.*(恋爱|脱单|结婚)|会不会.*(恋爱|脱单|结婚)|姻缘|桃花运|命运|运势|占卜|算命)/u;

@Injectable()
export class CommentAiService {
  private readonly logger = new Logger(CommentAiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly grokBotService: GrokBotService,
    private readonly aiSummaryService: AiSummaryService,
    private readonly videoAiSummaryService: VideoAiSummaryService,
  ) {}

  async enqueueIfMention(input: { commentId: number; videoId: number; requesterId: number; content: string }) {
    const mentionPrompt = this.extractMentionPrompt(input.content);
    if (!mentionPrompt) {
      return { queued: false as const, reason: 'no_mention' as const };
    }

    const botUser = await this.grokBotService.getBotUser();
    if (input.requesterId === botUser.id) {
      return { queued: false as const, reason: 'bot_user' as const };
    }

    const rateLimited = await this.isRateLimited(input.requesterId);
    if (rateLimited) {
      this.logger.warn(
        `Skip @grok task for comment ${input.commentId}: requester ${input.requesterId} is rate limited`,
      );
      return { queued: false as const, reason: 'rate_limited' as const };
    }

    try {
      await this.prisma.commentAiTask.create({
        data: {
          commentId: input.commentId,
          videoId: input.videoId,
          requesterId: input.requesterId,
          prompt: mentionPrompt,
          status: 'PENDING',
        },
      });

      return { queued: true as const };
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        return { queued: false as const, reason: 'duplicate_task' as const };
      }
      throw error;
    }
  }

  async processPendingTasks(limit: number) {
    const normalizedLimit = Math.max(1, limit);
    const taskIds = await this.findCandidateTaskIds(normalizedLimit);

    for (const taskId of taskIds) {
      const claimed = await this.claimTask(taskId);
      if (!claimed) {
        continue;
      }
      await this.processClaimedTask(taskId);
    }
  }

  private async processClaimedTask(taskId: number) {
    const task = await this.prisma.commentAiTask.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        commentId: true,
        videoId: true,
        requesterId: true,
        prompt: true,
        replyCommentId: true,
        attempts: true,
      },
    });

    if (!task) {
      return;
    }

    try {
      if (task.replyCommentId) {
        await this.markTaskSuccess(task.id, task.replyCommentId);
        return;
      }

      const sourceComment = await this.prisma.comment.findUnique({
        where: { id: task.commentId },
        include: {
          video: {
            select: {
              id: true,
              title: true,
              status: true,
            },
          },
        },
      });

      if (!sourceComment) {
        throw new Error('Source comment not found');
      }

      const botUser = await this.grokBotService.getBotUser();
      if (sourceComment.userId === botUser.id) {
        throw new Error('Bot comment cannot trigger @grok');
      }

      const existingBotReply = await this.prisma.comment.findFirst({
        where: {
          parentId: sourceComment.id,
          userId: botUser.id,
          videoId: sourceComment.videoId,
        },
        select: {
          id: true,
        },
        orderBy: [{ createdAt: 'desc' }],
      });

      if (existingBotReply) {
        await this.markTaskSuccess(task.id, existingBotReply.id);
        return;
      }

      const replyContent = await this.generateBotReply({
        videoId: sourceComment.videoId,
        videoTitle: sourceComment.video.title,
        prompt: task.prompt,
      });

      const rootId = sourceComment.rootId ?? sourceComment.id;

      await this.prisma.$transaction(async (tx) => {
        const reply = await tx.comment.create({
          data: {
            videoId: sourceComment.videoId,
            userId: botUser.id,
            content: this.truncate(replyContent, 1000),
            parentId: sourceComment.id,
            rootId,
            status: 'NORMAL',
          },
          select: {
            id: true,
            content: true,
          },
        });

        await tx.video.update({
          where: { id: sourceComment.videoId },
          data: {
            commentCount: {
              increment: 1,
            },
          },
        });

        await tx.comment.update({
          where: { id: sourceComment.id },
          data: {
            replyCount: {
              increment: 1,
            },
          },
        });

        await tx.notification.create({
          data: {
            recipientId: sourceComment.userId,
            actorId: botUser.id,
            type: 'REPLY',
            title: 'Grok 回复了你的评论',
            content: `${botUser.nickname}：${reply.content.slice(0, 80)}`,
            relatedType: 'VIDEO',
            relatedId: sourceComment.videoId,
          },
        });

        await tx.commentAiTask.update({
          where: { id: task.id },
          data: {
            status: 'SUCCESS',
            replyCommentId: reply.id,
            errorMessage: null,
          },
        });
      });
    } catch (error) {
      const message = this.getErrorMessage(error);
      this.logger.error(`Failed to process comment ai task #${task.id}: ${message}`);
      await this.prisma.commentAiTask.update({
        where: { id: task.id },
        data: {
          status: 'FAILED',
          errorMessage: this.truncate(message, 1024),
        },
      });
    }
  }

  private async generateBotReply(input: { videoId: number; videoTitle: string; prompt: string }) {
    if (this.isPersonalFortuneQuestion(input.prompt)) {
      return '我只能基于当前视频内容回答，关于你什么时候会有甜甜的恋爱，我没法判断。';
    }

    if (!this.isVideoRelatedQuestion(input.prompt)) {
      return '我主要根据当前视频画面来回答，这个问题和视频内容关联不强，暂时没法准确判断。';
    }

    const summaryRecord = await this.prisma.videoAiSummary.findUnique({
      where: { videoId: input.videoId },
      select: {
        summary: true,
      },
    });

    if (summaryRecord?.summary?.trim()) {
      const replyFromSummary = await this.aiSummaryService.generateTextReply(
        this.buildSummaryPrompt({
          question: input.prompt,
          videoTitle: input.videoTitle,
          summary: summaryRecord.summary,
        }),
        0.2,
      );

      const normalizedSummaryReply = this.normalizeReply(replyFromSummary.text);
      if (!this.isInsufficient(normalizedSummaryReply)) {
        return normalizedSummaryReply;
      }
    }

    const chatResult = await this.videoAiSummaryService.chatWithVideo(input.videoId, input.prompt);
    const normalizedChatReply = this.normalizeReply(chatResult.reply);
    return normalizedChatReply || INSUFFICIENT_REPLY;
  }

  private async findCandidateTaskIds(limit: number) {
    const maxAttempts = this.getMaxAttempts();
    const now = Date.now();
    const retryEligibleAt = new Date(now - this.getRetryDelayMs());
    const runningStaleAt = new Date(now - this.getRunningStaleMs());

    const tasks = await this.prisma.commentAiTask.findMany({
      where: {
        attempts: {
          lt: maxAttempts,
        },
        OR: [
          {
            status: 'PENDING',
          },
          {
            status: 'FAILED',
            updatedAt: {
              lte: retryEligibleAt,
            },
          },
          {
            status: 'RUNNING',
            updatedAt: {
              lte: runningStaleAt,
            },
          },
        ],
      },
      orderBy: [{ createdAt: 'asc' }],
      take: limit,
      select: {
        id: true,
      },
    });

    return tasks.map((item) => item.id);
  }

  private async claimTask(taskId: number) {
    const maxAttempts = this.getMaxAttempts();
    const now = Date.now();
    const retryEligibleAt = new Date(now - this.getRetryDelayMs());
    const runningStaleAt = new Date(now - this.getRunningStaleMs());

    const result = await this.prisma.commentAiTask.updateMany({
      where: {
        id: taskId,
        attempts: {
          lt: maxAttempts,
        },
        OR: [
          { status: 'PENDING' },
          {
            status: 'FAILED',
            updatedAt: {
              lte: retryEligibleAt,
            },
          },
          {
            status: 'RUNNING',
            updatedAt: {
              lte: runningStaleAt,
            },
          },
        ],
      },
      data: {
        status: 'RUNNING',
        attempts: {
          increment: 1,
        },
        errorMessage: null,
      },
    });

    return result.count > 0;
  }

  private async markTaskSuccess(taskId: number, replyCommentId: number) {
    await this.prisma.commentAiTask.update({
      where: { id: taskId },
      data: {
        status: 'SUCCESS',
        replyCommentId,
        errorMessage: null,
      },
    });
  }

  private extractMentionPrompt(content: string) {
    const match = MENTION_PATTERN.exec(content);
    if (!match) {
      return null;
    }

    const rawQuestion = content.slice(match.index + match[0].length);
    const normalizedQuestion = rawQuestion.replace(/^[\s:：,，。.!！?？;；]+/u, '').trim();
    return normalizedQuestion || DEFAULT_MENTION_PROMPT;
  }

  private async isRateLimited(requesterId: number) {
    const maxTriggers = this.getRateLimitMaxPerWindow();
    if (maxTriggers <= 0) {
      return false;
    }

    const since = new Date(Date.now() - this.getRateLimitWindowMinutes() * 60 * 1000);
    const count = await this.prisma.commentAiTask.count({
      where: {
        requesterId,
        createdAt: {
          gte: since,
        },
      },
    });
    return count >= maxTriggers;
  }

  private buildSummaryPrompt(input: { question: string; videoTitle: string; summary: string }) {
    return [
      '你是视频评论区智能助手，请根据已知信息回答用户问题。',
      `视频标题：${input.videoTitle}`,
      `视频摘要：${input.summary}`,
      `用户问题：${input.question}`,
      '回复要求：',
      '1）仅使用已知信息，不得编造；',
      '2）中文回答，控制在1~2句话，口语化、自然；',
      '3）不要文学化夸张，不要做价值评判，不要写“你一定会/迟早会”这类句子；',
      '4）若无法判断，请明确写“信息不足，无法准确判断”。',
    ].join('\n');
  }

  private normalizeReply(raw: string) {
    const compact = raw.replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
    if (!compact) {
      return INSUFFICIENT_REPLY;
    }

    const sentences = compact
      .split(/(?<=[。！？!?])/u)
      .map((item) => item.trim())
      .filter(Boolean);

    const merged = (sentences.length > 2 ? sentences.slice(0, 2) : sentences).join('');
    const value = merged || compact;
    return this.truncate(value, 180);
  }

  private isInsufficient(reply: string) {
    return /(不足以判断|信息不足|无法准确判断|无法判断|不确定)/u.test(reply);
  }

  private isPersonalFortuneQuestion(prompt: string) {
    return NON_VIDEO_PERSONAL_QUERY_PATTERN.test(prompt);
  }

  private isVideoRelatedQuestion(prompt: string) {
    return /(视频|画面|镜头|人物|动作|场景|内容|发生|在做什么|看起来|这个人|这个女生|这个男生|刚刚)/u.test(
      prompt,
    );
  }

  private truncate(value: string, maxLength: number) {
    if (value.length <= maxLength) {
      return value;
    }
    return value.slice(0, maxLength);
  }

  private getRateLimitWindowMinutes() {
    const value = Number(this.configService.get<string>('COMMENT_AI_RATE_LIMIT_WINDOW_MINUTES') || 10);
    if (!Number.isFinite(value) || value <= 0) {
      return 10;
    }
    return Math.floor(value);
  }

  private getRateLimitMaxPerWindow() {
    const value = Number(this.configService.get<string>('COMMENT_AI_RATE_LIMIT_MAX_PER_WINDOW') || 3);
    if (!Number.isFinite(value) || value < 0) {
      return 3;
    }
    return Math.floor(value);
  }

  private getRetryDelayMs() {
    const value = Number(this.configService.get<string>('COMMENT_AI_RETRY_DELAY_MS') || 15000);
    if (!Number.isFinite(value) || value < 0) {
      return 15000;
    }
    return Math.floor(value);
  }

  private getRunningStaleMs() {
    const value = Number(this.configService.get<string>('COMMENT_AI_RUNNING_STALE_MS') || 180000);
    if (!Number.isFinite(value) || value < 1000) {
      return 180000;
    }
    return Math.floor(value);
  }

  private getMaxAttempts() {
    const value = Number(this.configService.get<string>('COMMENT_AI_MAX_ATTEMPTS') || 3);
    if (!Number.isFinite(value) || value < 1) {
      return 3;
    }
    return Math.floor(value);
  }

  private isUniqueConstraintError(error: unknown) {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === 'P2002'
    );
  }

  private getErrorMessage(error: unknown) {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}
