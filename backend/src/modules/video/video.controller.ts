import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Express } from 'express';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

import { ok } from '../../common/dto/api-response.dto';
import { VIDEO_CATEGORY_CODES } from '../../common/constants/categories';
import { VIDEO_COIN_LIMIT_PER_USER } from '../../common/constants/coins';
import { AuthService } from '../auth/auth.service';
import { VideoService } from './video.service';

class CreateVideoDto {
  @IsOptional()
  @IsInt()
  assetId?: number;

  @IsOptional()
  @IsString()
  uploadToken?: string;

  @ValidateIf((value) => value.assetId === undefined && !value.uploadToken)
  @IsString()
  requiredUploadReference?: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @IsIn(VIDEO_CATEGORY_CODES as unknown as string[])
  category?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @IsString({ each: true })
  @IsIn(VIDEO_CATEGORY_CODES as unknown as string[], { each: true })
  categories?: string[];

  @IsOptional()
  @IsArray()
  tagIds?: number[];

  @IsOptional()
  @IsString()
  coverUrl?: string;

  @IsOptional()
  @IsInt()
  coverAssetId?: number;

  @IsOptional()
  @IsString()
  coverUploadToken?: string;
}

class UpdateVideoDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @IsIn(VIDEO_CATEGORY_CODES as unknown as string[])
  category?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @IsString({ each: true })
  @IsIn(VIDEO_CATEGORY_CODES as unknown as string[], { each: true })
  categories?: string[];

  @IsOptional()
  @IsString()
  coverUrl?: string;
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

class RecordPlayDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  videoDurationSeconds?: number;
}

class CoinVideoDto {
  @IsInt()
  @Min(1)
  @Max(VIDEO_COIN_LIMIT_PER_USER)
  amount!: number;
}

class FavoriteVideoDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  folderId?: number;
}

class CreateFavoriteFolderDto {
  @IsString()
  @MaxLength(64)
  name!: string;
}

class ReportWatchProgressDto {
  @IsInt()
  @Min(0)
  watchedSeconds!: number;

  @IsInt()
  @Min(0)
  currentTimeSeconds!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  videoDurationSeconds?: number;

  @IsString()
  @IsIn(['pause', 'leave', 'ended'])
  event!: 'pause' | 'leave' | 'ended';
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

  @Put(':id')
  async updateVideo(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateVideoDto,
  ) {
    const user = await this.authService.requireUser(authorization);
    return ok(await this.videoService.updateDraft(id, user, dto));
  }

  @Delete(':id')
  async deleteVideo(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const user = await this.authService.requireUser(authorization);
    return ok(await this.videoService.deleteCreatorVideo(id, user));
  }

  @Post(':id/withdraw-review')
  async withdrawReview(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const user = await this.authService.requireUser(authorization);
    return ok(await this.videoService.withdrawReview(id, user));
  }

  @Get('my/favorites')
  async getMyFavorites(
    @Headers('authorization') authorization: string | undefined,
    @Query('folderId') folderId?: string,
  ) {
    const user = await this.authService.requireUser(authorization);
    const resolvedFolderId = folderId === undefined ? undefined : Number(folderId);
    if (resolvedFolderId !== undefined && (!Number.isInteger(resolvedFolderId) || resolvedFolderId < 1)) {
      throw new BadRequestException('folderId must be a positive integer');
    }
    return ok(await this.videoService.getUserFavorites(user.id, resolvedFolderId));
  }

  @Get('my/favorite-folders')
  async getMyFavoriteFolders(@Headers('authorization') authorization: string | undefined) {
    const user = await this.authService.requireUser(authorization);
    return ok(await this.videoService.listFavoriteFolders(user.id));
  }

  @Post('my/favorite-folders')
  async createFavoriteFolder(
    @Headers('authorization') authorization: string | undefined,
    @Body() dto: CreateFavoriteFolderDto,
  ) {
    const user = await this.authService.requireUser(authorization);
    return ok(await this.videoService.createFavoriteFolder(user.id, dto.name));
  }

  @Delete('my/favorite-folders/:folderId')
  async deleteFavoriteFolder(
    @Headers('authorization') authorization: string | undefined,
    @Param('folderId', ParseIntPipe) folderId: number,
  ) {
    const user = await this.authService.requireUser(authorization);
    return ok(await this.videoService.deleteFavoriteFolder(user.id, folderId));
  }

  @Get('my/likes')
  async getMyLikes(@Headers('authorization') authorization: string | undefined) {
    const user = await this.authService.requireUser(authorization);
    return ok(await this.videoService.getUserLikes(user.id));
  }

  @Get('my/history')
  async getMyHistory(@Headers('authorization') authorization: string | undefined) {
    const user = await this.authService.requireUser(authorization);
    return ok(await this.videoService.getUserHistory(user.id));
  }

  @Get(':id/reviews')
  async getReviewHistory(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const user = await this.authService.requireUser(authorization);
    return ok(await this.videoService.getReviewHistory(id, user));
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @Headers('authorization') authorization: string | undefined,
    @UploadedFile() file?: Express.Multer.File,
    @Query('assetType') assetType?: 'ORIGINAL' | 'COVER' | 'RECORDING',
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
  async getRecommendations(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', ParseIntPipe) id: number,
    @Query('limit') limit?: string,
  ) {
    const user = await this.authService.getCurrentUser(authorization);
    return ok(
      await this.videoService.getRelatedVideos(id, user?.id, {
        limit: limit !== undefined ? Number(limit) : undefined,
      }),
    );
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
  async likeVideo(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const user = await this.authService.requireUser(authorization);
    return ok(await this.videoService.likeVideo(id, user));
  }

  @Delete(':id/like')
  async unlikeVideo(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const user = await this.authService.requireUser(authorization);
    return ok(await this.videoService.unlikeVideo(id, user));
  }

  @Post(':id/favorite')
  async favoriteVideo(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: FavoriteVideoDto,
  ) {
    const user = await this.authService.requireUser(authorization);
    return ok(await this.videoService.favoriteVideo(id, user, dto));
  }

  @Post(':id/coin')
  async coinVideo(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CoinVideoDto,
  ) {
    const user = await this.authService.requireUser(authorization);
    return ok(await this.videoService.coinVideo(id, user, dto.amount));
  }

  @Post(':id/play')
  async recordPlay(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RecordPlayDto,
  ) {
    const user = await this.authService.getCurrentUser(authorization);
    return ok(await this.videoService.recordPlay(id, user, dto));
  }

  @Post(':id/watch-progress')
  async reportWatchProgress(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReportWatchProgressDto,
  ) {
    const user = await this.authService.requireUser(authorization);
    return ok(await this.videoService.recordWatchProgress(id, user, dto));
  }

  @Delete(':id/favorite')
  async unfavoriteVideo(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const user = await this.authService.requireUser(authorization);
    return ok(await this.videoService.unfavoriteVideo(id, user));
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
