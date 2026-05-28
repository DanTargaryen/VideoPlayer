import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { CommentAiService } from '../comment-ai/comment-ai.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CommentService {
  private readonly logger = new Logger(CommentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly commentAiService: CommentAiService,
  ) {}

  async listComments(videoId: number) {
    const comments = await this.prisma.comment.findMany({
      where: { videoId, status: 'NORMAL' },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
          },
        },
      },
      orderBy: [{ createdAt: 'asc' }],
    });

    return {
      videoId,
      items: this.buildCommentTree(comments),
    };
  }

  async getCommentThread(videoId: number, rootId: number) {
    const comments = await this.prisma.comment.findMany({
      where: {
        videoId,
        status: 'NORMAL',
        OR: [{ id: rootId }, { rootId }],
      },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
          },
        },
      },
      orderBy: [{ createdAt: 'asc' }],
    });

    const roots = this.buildCommentTree(comments);
    const thread = roots.find((item) => item.id === rootId);
    if (!thread) {
      throw new NotFoundException('Comment thread not found');
    }

    return thread;
  }

  async createComment(
    videoId: number,
    user: { id: number; nickname: string },
    payload: { content: string; imageUrl?: string; parentId?: number; rootId?: number },
  ) {
    const video = await this.prisma.video.findUnique({ where: { id: videoId } });

    if (!video || video.status !== 'PUBLISHED') {
      throw new NotFoundException('Video not found');
    }

    let parent = null;
    if (payload.parentId) {
      parent = await this.prisma.comment.findUnique({ where: { id: payload.parentId } });
      if (!parent) {
        throw new NotFoundException('Parent comment not found');
      }
    }

    const created = await this.prisma.comment.create({
      data: {
        videoId,
        userId: user.id,
        content: payload.content,
        imageUrl: payload.imageUrl ?? null,
        parentId: payload.parentId ?? null,
        rootId: payload.rootId ?? payload.parentId ?? null,
        status: 'NORMAL',
      },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
          },
        },
      },
    });

    await this.prisma.video.update({
      where: { id: videoId },
      data: {
        commentCount: {
          increment: 1,
        },
      },
    });

    if (payload.parentId) {
      await this.prisma.comment.update({
        where: { id: payload.parentId },
        data: {
          replyCount: {
            increment: 1,
          },
        },
      });
    }

    const notificationRecipientId = payload.parentId ? parent?.userId ?? null : video.creatorId;

    if (notificationRecipientId && notificationRecipientId !== user.id) {
      const notificationPreview = payload.content || '[图片评论]';
      await this.prisma.notification.create({
        data: {
          recipientId: notificationRecipientId,
          actorId: user.id,
          type: payload.parentId ? 'REPLY' : 'COMMENT',
          title: payload.parentId ? '收到新的回复' : '收到新的评论',
          content: `${user.nickname}：${notificationPreview.slice(0, 80)}`,
          relatedType: 'VIDEO',
          relatedId: videoId,
        },
      });
    }

    void this.commentAiService
      .enqueueIfMention({
        commentId: created.id,
        videoId,
        requesterId: user.id,
        content: payload.content,
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Failed to enqueue @grok task for comment ${created.id}: ${message}`);
      });

    return created;
  }

  private buildCommentTree<T extends { id: number; parentId: number | null }>(comments: T[]) {
    type CommentNode = T & { replies: CommentNode[] };

    const nodeMap = new Map<number, CommentNode>();
    for (const c of comments) {
      nodeMap.set(c.id, { ...c, replies: [] });
    }

    const roots: CommentNode[] = [];
    for (const c of comments) {
      const node = nodeMap.get(c.id)!;
      if (c.parentId === null) {
        roots.push(node);
      } else {
        const parent = nodeMap.get(c.parentId);
        if (parent) {
          parent.replies.push(node);
        }
      }
    }

    return roots;
  }
}
