import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VideoAiChatRepository {
  constructor(private readonly prisma: PrismaService) {}

  findSessionMessages(userId: number, videoId: number) {
    return this.prisma.videoAiChatSession.findUnique({
      where: {
        userId_videoId: {
          userId,
          videoId,
        },
      },
      include: {
        messages: {
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        },
      },
    });
  }

  async saveExchange(payload: {
    userId: number;
    videoId: number;
    prompt: string;
    reply: string;
    model: string;
    frameCount: number;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const session = await tx.videoAiChatSession.upsert({
        where: {
          userId_videoId: {
            userId: payload.userId,
            videoId: payload.videoId,
          },
        },
        create: {
          userId: payload.userId,
          videoId: payload.videoId,
        },
        update: {
          updatedAt: new Date(),
        },
      });

      const userMessage = await tx.videoAiChatMessage.create({
        data: {
          sessionId: session.id,
          role: 'USER',
          content: payload.prompt,
        },
      });

      const assistantMessage = await tx.videoAiChatMessage.create({
        data: {
          sessionId: session.id,
          role: 'ASSISTANT',
          content: payload.reply,
          model: payload.model,
          frameCount: payload.frameCount,
        },
      });

      return {
        session,
        userMessage,
        assistantMessage,
      };
    });
  }
}
