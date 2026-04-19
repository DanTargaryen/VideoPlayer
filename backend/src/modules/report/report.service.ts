import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportService {
  constructor(private readonly prisma: PrismaService) {}

  async createReport(
    reporter: { id: number },
    payload: { targetType: 'VIDEO' | 'COMMENT' | 'VIDEO_DANMAKU'; targetId: number; reason: string },
  ) {
    if (!payload.reason.trim()) {
      throw new BadRequestException('Reason is required');
    }

    const baseData = {
      reporterId: reporter.id,
      targetType: payload.targetType,
      reason: payload.reason.trim(),
      status: 'PENDING' as const,
    };

    if (payload.targetType === 'VIDEO') {
      const video = await this.prisma.video.findUnique({ where: { id: payload.targetId } });
      if (!video) throw new NotFoundException('Video not found');
      return this.prisma.reportRecord.create({
        data: {
          ...baseData,
          videoId: payload.targetId,
        },
      });
    }

    if (payload.targetType === 'COMMENT') {
      const comment = await this.prisma.comment.findUnique({ where: { id: payload.targetId } });
      if (!comment) throw new NotFoundException('Comment not found');
      return this.prisma.reportRecord.create({
        data: {
          ...baseData,
          commentId: payload.targetId,
        },
      });
    }

    const danmaku = await this.prisma.videoDanmaku.findUnique({ where: { id: payload.targetId } });
    if (!danmaku) throw new NotFoundException('Danmaku not found');
    return this.prisma.reportRecord.create({
      data: {
        ...baseData,
        danmakuId: payload.targetId,
      },
    });
  }
}
