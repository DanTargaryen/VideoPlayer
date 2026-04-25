import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VideoAiSummaryRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByVideoId(videoId: number) {
    return this.prisma.videoAiSummary.findUnique({
      where: {
        videoId,
      },
    });
  }

  saveSummary(payload: { videoId: number; summary: string; frameCount: number; model: string }) {
    return this.prisma.videoAiSummary.upsert({
      where: {
        videoId: payload.videoId,
      },
      create: {
        videoId: payload.videoId,
        summary: payload.summary,
        frameCount: payload.frameCount,
        model: payload.model,
      },
      update: {
        summary: payload.summary,
        frameCount: payload.frameCount,
        model: payload.model,
      },
    });
  }
}
