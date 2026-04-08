import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CommentService {
  constructor(private readonly prisma: PrismaService) {}

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

    const topLevel = comments.filter((item: (typeof comments)[number]) => item.parentId === null);
    const replies = comments.filter((item: (typeof comments)[number]) => item.parentId !== null);

    return {
      videoId,
      items: topLevel.map((item: (typeof topLevel)[number]) => ({
        ...item,
        replies: replies.filter((reply: (typeof replies)[number]) => reply.rootId === item.id),
      })),
    };
  }

  async createComment(
    videoId: number,
    user: { id: number; nickname: string },
    payload: { content: string; parentId?: number; rootId?: number },
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
      await this.prisma.notification.create({
        data: {
          recipientId: notificationRecipientId,
          actorId: user.id,
          type: payload.parentId ? 'REPLY' : 'COMMENT',
          title: payload.parentId ? '收到新的回复' : '收到新的评论',
          content: `${user.nickname}：${payload.content.slice(0, 80)}`,
          relatedType: 'VIDEO',
          relatedId: videoId,
        },
      });
    }

    return created;
  }
}
