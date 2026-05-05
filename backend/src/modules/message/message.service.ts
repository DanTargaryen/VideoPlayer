import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { FollowService } from '../follow/follow.service';
import { PrismaService } from '../prisma/prisma.service';

type AuthUser = {
  id: number;
  nickname: string;
};

type MessagePrivacy = 'ALLOW_ALL' | 'FOLLOWING_ONLY' | 'DISABLED';

@Injectable()
export class MessageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly followService: FollowService,
  ) {}

  async listConversations(userId: number) {
    const messages = await this.prisma.directMessage.findMany({
      where: {
        OR: [{ senderId: userId }, { recipientId: userId }],
      },
      include: {
        sender: {
          select: {
            id: true,
            nickname: true,
            avatarUrl: true,
          },
        },
        recipient: {
          select: {
            id: true,
            nickname: true,
            avatarUrl: true,
            messagePrivacy: true,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 200,
    });

    const conversationIndex = new Map<number, (typeof messages)[number]>();
    for (const message of messages) {
      const peerId = message.senderId === userId ? message.recipientId : message.senderId;
      if (!conversationIndex.has(peerId)) {
        conversationIndex.set(peerId, message);
      }
    }

    const peerIds = Array.from(conversationIndex.keys());
    if (peerIds.length === 0) {
      return [];
    }

    const unreadGroups = await this.prisma.directMessage.groupBy({
      by: ['senderId'],
      where: {
        recipientId: userId,
        senderId: { in: peerIds },
        isRead: false,
      },
      _count: {
        _all: true,
      },
    });
    const unreadIndex = new Map<number, number>(unreadGroups.map((item) => [item.senderId, item._count._all]));

    const summaries = await Promise.all(
      peerIds.map(async (peerId) => {
        const latest = conversationIndex.get(peerId);
        if (!latest) {
          return null;
        }

        const user = latest.senderId === userId ? latest.recipient : latest.sender;
        const permission = await this.resolveSendPermission(userId, peerId);

        return {
          user,
          unreadCount: unreadIndex.get(peerId) ?? 0,
          lastMessage: {
            id: latest.id,
            content: latest.content,
            createdAt: latest.createdAt,
            senderId: latest.senderId,
          },
          ...permission,
        };
      }),
    );

    return summaries.filter((item): item is NonNullable<typeof item> => Boolean(item));
  }

  async getConversation(userId: number, targetUserId: number) {
    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        nickname: true,
        avatarUrl: true,
        messagePrivacy: true,
      },
    });

    if (!targetUser) {
      throw new NotFoundException('用户不存在');
    }

    const permission = await this.resolveSendPermission(userId, targetUserId, targetUser.messagePrivacy);

    await this.prisma.directMessage.updateMany({
      where: {
        senderId: targetUserId,
        recipientId: userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    const messages = await this.prisma.directMessage.findMany({
      where: {
        OR: [
          { senderId: userId, recipientId: targetUserId },
          { senderId: targetUserId, recipientId: userId },
        ],
      },
      include: {
        sender: {
          select: {
            id: true,
            nickname: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: 200,
    });

    return {
      targetUser,
      messages,
      ...permission,
    };
  }

  async sendMessage(user: AuthUser, targetUserId: number, content: string) {
    const normalizedContent = content.trim();
    if (!normalizedContent) {
      throw new BadRequestException('私信内容不能为空');
    }

    if (normalizedContent.length > 1000) {
      throw new BadRequestException('私信内容不能超过 1000 个字符');
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        nickname: true,
        avatarUrl: true,
        messagePrivacy: true,
      },
    });

    if (!targetUser) {
      throw new NotFoundException('用户不存在');
    }

    const permission = await this.resolveSendPermission(user.id, targetUserId, targetUser.messagePrivacy);
    if (!permission.canSend) {
      throw new BadRequestException(permission.reason || '当前无法向该用户发送私信');
    }

    const message = await this.prisma.directMessage.create({
      data: {
        senderId: user.id,
        recipientId: targetUserId,
        content: normalizedContent,
      },
      include: {
        sender: {
          select: {
            id: true,
            nickname: true,
            avatarUrl: true,
          },
        },
      },
    });

    return {
      message,
      targetUser,
      ...permission,
    };
  }

  async getUnreadCount(userId: number) {
    const unreadCount = await this.prisma.directMessage.count({
      where: {
        recipientId: userId,
        isRead: false,
      },
    });

    return { unreadCount };
  }

  private async resolveSendPermission(
    senderId: number,
    recipientId: number,
    providedPrivacy?: MessagePrivacy,
  ) {
    if (senderId === recipientId) {
      return {
        canSend: false,
        messagePrivacy: providedPrivacy ?? 'ALLOW_ALL',
        senderFollowsRecipient: false,
        recipientFollowsSender: false,
        reason: '不能给自己发送私信',
      };
    }

    const recipient =
      providedPrivacy !== undefined
        ? { messagePrivacy: providedPrivacy }
        : await this.prisma.user.findUnique({
            where: { id: recipientId },
            select: { messagePrivacy: true },
          });

    if (!recipient) {
      throw new NotFoundException('用户不存在');
    }

    const [senderFollowsRecipient, recipientFollowsSender] = await Promise.all([
      this.followService.isFollowing(recipientId, senderId),
      this.followService.isFollowing(senderId, recipientId),
    ]);

    if (recipient.messagePrivacy === 'DISABLED') {
      return {
        canSend: false,
        messagePrivacy: recipient.messagePrivacy,
        senderFollowsRecipient,
        recipientFollowsSender,
        reason: '对方已关闭私信',
      };
    }

    if (recipient.messagePrivacy === 'FOLLOWING_ONLY' && !recipientFollowsSender) {
      return {
        canSend: false,
        messagePrivacy: recipient.messagePrivacy,
        senderFollowsRecipient,
        recipientFollowsSender,
        reason: '对方仅允许其关注的人私信',
      };
    }

    return {
      canSend: true,
      messagePrivacy: recipient.messagePrivacy,
      senderFollowsRecipient,
      recipientFollowsSender,
      reason: '',
    };
  }
}
