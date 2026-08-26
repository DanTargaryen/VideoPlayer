import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { IsIn, IsOptional, IsString } from 'class-validator';

import { ok } from '../../common/dto/api-response.dto';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';

class ReviewVideoDto {
  @IsString()
  @IsIn(['APPROVE', 'REJECT'])
  action!: 'APPROVE' | 'REJECT';

  @IsOptional()
  @IsString()
  reason?: string;
}

class ModerateTextDto {
  @IsString()
  @IsIn(['KEEP', 'HIDE', 'DELETE'])
  action!: 'KEEP' | 'HIDE' | 'DELETE';

  @IsOptional()
  @IsString()
  reason?: string;
}

class HandleReportDto {
  @IsString()
  @IsIn(['KEEP', 'DELETE'])
  action!: 'KEEP' | 'DELETE';

  @IsOptional()
  @IsString()
  reason?: string;
}

@Controller('admin')
export class AdminController {
  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  private async requireAdmin(authorization?: string) {
    const user = await this.authService.requireUser(authorization);
    if (user.role !== 'ADMIN') {
      throw new UnauthorizedException('Admin required');
    }
    return user;
  }

  @Get('reviews/videos')
  async getVideoReviewQueue(@Headers('authorization') authorization?: string) {
    await this.requireAdmin(authorization);

    const items = await this.prisma.videoReview.findMany({
      include: {
        video: true,
        reviewer: {
          select: {
            id: true,
            nickname: true,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });

    const latestReviewItems = Array.from(
      items
        .reduce((index, item) => {
          if (!index.has(item.videoId)) {
            index.set(item.videoId, item);
          }
          return index;
        }, new Map<number, (typeof items)[number]>())
        .values(),
    );

    return ok(latestReviewItems);
  }

  @Post('reviews/videos/:id')
  async reviewVideo(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReviewVideoDto,
  ) {
    const user = await this.requireAdmin(authorization);

    const review = await this.prisma.videoReview.findUnique({
      where: { id },
      include: { video: true },
    });

    if (!review) {
      throw new UnauthorizedException('Review not found');
    }
    const approve = dto.action === 'APPROVE';
    const rejectReason = dto.reason ?? '需要修改后重新提交';

    const [updatedReview, updatedVideo] = await this.prisma.$transaction([
      this.prisma.videoReview.update({
        where: { id },
        data: {
          reviewerId: user.id,
          reviewedAt: new Date(),
          status: approve ? 'APPROVED' : 'REJECTED',
          reason: approve ? null : rejectReason,
        },
      }),
      this.prisma.video.update({
        where: { id: review.videoId },
        data: {
          status: approve ? 'PUBLISHED' : 'REJECTED',
          publishedAt: approve ? new Date() : null,
          rejectReason: approve ? null : rejectReason,
        },
      }),
    ]);

    return ok({
      id: updatedReview.id,
      status: updatedReview.status,
      videoId: updatedVideo.id,
      videoStatus: updatedVideo.status,
      reason: updatedReview.reason,
    });
  }

  @Get('reviews/text-content')
  async getTextReviewQueue(
    @Headers('authorization') authorization: string | undefined,
    @Query('targetType') targetType?: 'COMMENT' | 'VIDEO_DANMAKU',
  ) {
    await this.requireAdmin(authorization);

    const commentRows = targetType && targetType !== 'COMMENT'
      ? []
      : await this.prisma.comment.findMany({
          where: { status: { not: 'NORMAL' } },
          include: { user: { select: { id: true, nickname: true } }, video: true },
          orderBy: { createdAt: 'desc' },
        });

    const danmakuRows = targetType && targetType !== 'VIDEO_DANMAKU'
      ? []
      : await this.prisma.videoDanmaku.findMany({
          where: { status: { not: 'NORMAL' } },
          include: { user: { select: { id: true, nickname: true } }, video: true },
          orderBy: { createdAt: 'desc' },
        });

    const items = [
      ...commentRows.map((item: (typeof commentRows)[number]) => ({
        id: item.id,
        targetType: 'COMMENT',
        status: item.status,
        content: item.content,
        user: item.user,
        video: { id: item.video.id, title: item.video.title },
        createdAt: item.createdAt,
      })),
      ...danmakuRows.map((item: (typeof danmakuRows)[number]) => ({
        id: item.id,
        targetType: 'VIDEO_DANMAKU',
        status: item.status,
        content: item.content,
        user: item.user,
        video: { id: item.video.id, title: item.video.title },
        createdAt: item.createdAt,
      })),
    ].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

    return ok(items);
  }

  @Post('reviews/text-content/:targetType/:id')
  async moderateTextContent(
    @Headers('authorization') authorization: string | undefined,
    @Param('targetType') targetType: 'COMMENT' | 'VIDEO_DANMAKU',
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ModerateTextDto,
  ) {
    const admin = await this.requireAdmin(authorization);

    const nextStatus = dto.action === 'KEEP' ? 'NORMAL' : dto.action === 'HIDE' ? 'HIDDEN' : 'DELETED';

    if (targetType === 'COMMENT') {
      const updated = await this.prisma.comment.update({
        where: { id },
        data: { status: nextStatus },
      });
      return ok({ id: updated.id, targetType, status: updated.status, operator: admin.nickname });
    }

    const updated = await this.prisma.videoDanmaku.update({
      where: { id },
      data: { status: nextStatus },
    });
    return ok({ id: updated.id, targetType, status: updated.status, operator: admin.nickname });
  }

  @Get('reports')
  async getReports(@Headers('authorization') authorization?: string) {
    await this.requireAdmin(authorization);

    const items = await this.prisma.reportRecord.findMany({
      include: {
        reporter: { select: { id: true, nickname: true } },
        handler: { select: { id: true, nickname: true } },
        video: { select: { id: true, title: true } },
        comment: { select: { id: true, content: true, status: true } },
        danmaku: { select: { id: true, content: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return ok(items);
  }

  @Post('reports/:id')
  async handleReport(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: HandleReportDto,
  ) {
    const admin = await this.requireAdmin(authorization);
    const report = await this.prisma.reportRecord.findUnique({ where: { id } });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    if (report.status !== 'PENDING') {
      throw new BadRequestException('Report already handled');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const reportUpdate = await tx.reportRecord.updateMany({
        where: { id, status: 'PENDING' },
        data: {
          status: dto.action === 'KEEP' ? 'REJECTED' : 'PROCESSED',
          handlerId: admin.id,
          handledAt: new Date(),
          handleNote: dto.reason ?? null,
        },
      });

      if (reportUpdate.count !== 1) {
        throw new BadRequestException('Report already handled');
      }

      if (report.targetType === 'COMMENT' && report.commentId) {
        await tx.comment.update({
          where: { id: report.commentId },
          data: { status: dto.action === 'KEEP' ? 'NORMAL' : 'DELETED' },
        });
      }
      if (report.targetType === 'VIDEO_DANMAKU' && report.danmakuId) {
        await tx.videoDanmaku.update({
          where: { id: report.danmakuId },
          data: { status: dto.action === 'KEEP' ? 'NORMAL' : 'DELETED' },
        });
      }
      if (report.targetType === 'VIDEO' && report.videoId && dto.action === 'DELETE') {
        await tx.video.update({
          where: { id: report.videoId },
          data: { status: 'REJECTED', rejectReason: dto.reason ?? '被举报后下架' },
        });
      }

      const handledReport = await tx.reportRecord.findUniqueOrThrow({
        where: { id },
      });

      const resultText = dto.action === 'KEEP' ? '经审核暂不删除目标内容' : '违规内容已删除或下架';
      await tx.notification.create({
        data: {
          recipientId: report.reporterId,
          actorId: admin.id,
          type: 'REPORT',
          title: '举报处理完成',
          content: dto.reason ? `${resultText}：${dto.reason}` : resultText,
          relatedType: 'REPORT',
          relatedId: handledReport.id,
        },
      });

      return handledReport;
    });

    return ok(updated);
  }

  @Delete('reports/:id')
  async deleteReportRecord(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.requireAdmin(authorization);
    const report = await this.prisma.reportRecord.findUnique({ where: { id } });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    if (report.status === 'PENDING') {
      throw new BadRequestException('Pending reports cannot be deleted before handling');
    }

    await this.prisma.reportRecord.delete({ where: { id } });
    return ok({ deleted: true, reportId: id });
  }

  @Get('dashboard')
  async getDashboard(@Headers('authorization') authorization?: string) {
    await this.requireAdmin(authorization);

    const [totalVideos, pendingReviews, publishedVideos, rejectedVideos, pendingReports, hiddenComments, hiddenDanmakus] = await Promise.all([
      this.prisma.video.count(),
      this.prisma.videoReview.count({ where: { status: 'PENDING' } }),
      this.prisma.video.count({ where: { status: 'PUBLISHED' } }),
      this.prisma.video.count({ where: { status: 'REJECTED' } }),
      this.prisma.reportRecord.count({ where: { status: 'PENDING' } }),
      this.prisma.comment.count({ where: { status: { not: 'NORMAL' } } }),
      this.prisma.videoDanmaku.count({ where: { status: { not: 'NORMAL' } } }),
    ]);

    return ok({
      totalVideos,
      pendingReviews,
      publishedVideos,
      rejectedVideos,
      pendingReports,
      hiddenComments,
      hiddenDanmakus,
    });
  }
}
