import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportService {
  constructor(private readonly prisma: PrismaService) {}

  async createReport(
    reporter: { id: number },
    payload: { targetType: 'VIDEO' | 'COMMENT' | 'VIDEO_DANMAKU'; targetId: number; reason: string },
  ) {
    const reason = payload.reason.trim();
    if (!reason) {
      throw new BadRequestException('Reason is required');
    }

    const pendingKey = `${reporter.id}:${payload.targetType}:${payload.targetId}`;
    const existingReport = await this.prisma.reportRecord.findUnique({ where: { pendingKey } });
    if (existingReport) {
      return existingReport;
    }

    const baseData = {
      reporterId: reporter.id,
      targetType: payload.targetType,
      reason,
      status: 'PENDING' as const,
      pendingKey,
    };

    let targetData: { videoId: number } | { commentId: number } | { danmakuId: number };

    if (payload.targetType === 'VIDEO') {
      const video = await this.prisma.video.findUnique({ where: { id: payload.targetId } });
      if (!video) throw new NotFoundException('Video not found');
      targetData = { videoId: payload.targetId };
    } else if (payload.targetType === 'COMMENT') {
      const comment = await this.prisma.comment.findUnique({ where: { id: payload.targetId } });
      if (!comment) throw new NotFoundException('Comment not found');
      targetData = { commentId: payload.targetId };
    } else {
      const danmaku = await this.prisma.videoDanmaku.findUnique({ where: { id: payload.targetId } });
      if (!danmaku) throw new NotFoundException('Danmaku not found');
      targetData = { danmakuId: payload.targetId };
    }

    try {
      return await this.prisma.reportRecord.create({ data: { ...baseData, ...targetData } });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        const winningReport = await this.prisma.reportRecord.findUnique({ where: { pendingKey } });
        if (winningReport) {
          return winningReport;
        }
      }
      throw error;
    }
  }

  private isUniqueConstraintError(error: unknown) {
    return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === 'P2002';
  }
}
