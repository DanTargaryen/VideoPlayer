import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  async listNotifications(userId: number) {
    return this.prisma.notification.findMany({
      where: { recipientId: userId },
      include: {
        actor: {
          select: {
            id: true,
            nickname: true,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
      take: 50,
    });
  }

  async markAllAsRead(userId: number) {
    await this.prisma.notification.updateMany({
      where: { recipientId: userId, isRead: false },
      data: { isRead: true },
    });

    return { success: true };
  }

  async markOneAsRead(userId: number, notificationId: number) {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        recipientId: userId,
      },
    });

    if (!notification) {
      throw new NotFoundException('通知不存在');
    }

    if (!notification.isRead) {
      await this.prisma.notification.update({
        where: { id: notificationId },
        data: { isRead: true },
      });
    }

    return { success: true };
  }

  async getUnreadCount(userId: number) {
    const count = await this.prisma.notification.count({
      where: { recipientId: userId, isRead: false },
    });

    return { unreadCount: count };
  }
}
