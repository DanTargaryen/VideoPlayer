import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Express } from 'express';
import { IsArray, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

import { ok } from '../../common/dto/api-response.dto';
import { AuthService } from '../auth/auth.service';
import { VideoService } from './video.service';

class CreateVideoDto {
  @IsInt()
  assetId!: number;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  categoryId!: number;

  @IsOptional()
  @IsArray()
  tagIds?: number[];

  @IsOptional()
  @IsString()
  coverUrl?: string;

  @IsOptional()
  @IsInt()
  coverAssetId?: number;
}

class CreateDanmakuDto {
  @IsString()
  @MaxLength(255)
  content!: string;

  @IsInt()
  @Min(0)
  timeOffsetMs!: number;

  @IsOptional()
  @IsString()
  color?: string;
}

@Controller('videos')
export class VideoController {
  constructor(
    private readonly videoService: VideoService,
    private readonly authService: AuthService,
  ) {}

  @Post()
  async createVideo(@Headers('authorization') authorization: string | undefined, @Body() dto: CreateVideoDto) {
    const user = await this.authService.requireUser(authorization);
    return ok(await this.videoService.createVideo(user, dto));
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @Headers('authorization') authorization: string | undefined,
    @UploadedFile() file?: Express.Multer.File,
    @Query('assetType') assetType?: 'ORIGINAL' | 'COVER',
  ) {
    await this.authService.requireUser(authorization);
    if (!file) {
      throw new BadRequestException('Upload file is required');
    }
    return ok(await this.videoService.uploadFile(file, assetType ?? 'ORIGINAL'));
  }

  @Get(':id')
  async getVideoDetail(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const user = await this.authService.getCurrentUser(authorization);
    return ok(await this.videoService.getVideoDetail(id, user?.id));
  }

  @Get(':id/recommendations')
  async getRecommendations(@Param('id', ParseIntPipe) id: number) {
    return ok(await this.videoService.getRelatedVideos(id));
  }

  @Post(':id/submit-review')
  async submitReview(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const user = await this.authService.requireUser(authorization);
    return ok(await this.videoService.submitReview(id, user));
  }

  @Post(':id/like')
  async toggleLike(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const user = await this.authService.requireUser(authorization);
    return ok(await this.videoService.toggleLike(id, user));
  }

  @Post(':id/favorite')
  async toggleFavorite(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const user = await this.authService.requireUser(authorization);
    return ok(await this.videoService.toggleFavorite(id, user));
  }

  @Get(':id/danmaku')
  async getDanmakus(
    @Param('id', ParseIntPipe) id: number,
    @Query('fromMs') fromMs?: string,
    @Query('toMs') toMs?: string,
  ) {
    return ok(
      await this.videoService.listDanmakus(
        id,
        fromMs !== undefined ? Number(fromMs) : undefined,
        toMs !== undefined ? Number(toMs) : undefined,
      ),
    );
  }

  @Post(':id/danmaku')
  async createDanmaku(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateDanmakuDto,
  ) {
    const user = await this.authService.requireUser(authorization);
    return ok(await this.videoService.createDanmaku(id, user, dto));
  }
}
