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
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsArray, IsOptional, IsString, MaxLength } from 'class-validator';
import type { Express } from 'express';

import { ok } from '../../common/dto/api-response.dto';
import { AuthService } from '../auth/auth.service';
import { DynamicPostsService } from './dynamic-posts.service';
import { FeedService, type DynamicFeedType } from './feed.service';

class CreateDynamicPostDto {
  @IsString()
  @MaxLength(1000)
  content!: string;

  @IsOptional()
  @IsArray()
  images?: string[];
}

class CreateDynamicPostCommentDto {
  @IsString()
  @MaxLength(1000)
  content!: string;
}

@Controller('feed')
export class FeedController {
  constructor(
    private readonly authService: AuthService,
    private readonly feedService: FeedService,
    private readonly dynamicPostsService: DynamicPostsService,
  ) {}

  @Get('dynamic')
  async getDynamicFeed(
    @Headers('authorization') authorization: string | undefined,
    @Query('type') type?: DynamicFeedType,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const user = await this.authService.getCurrentUser(authorization);
    return ok(
      await this.feedService.getDynamicFeed({
        currentUserId: user?.id,
        type,
        page: page !== undefined ? Number(page) : undefined,
        pageSize: pageSize !== undefined ? Number(pageSize) : undefined,
      }),
    );
  }

  @Get('sidebar/live')
  async getSidebarLive(@Headers('authorization') authorization: string | undefined) {
    const user = await this.authService.getCurrentUser(authorization);
    return ok(await this.feedService.getSidebarLive(user?.id));
  }

  @Get('sidebar/overview')
  async getSidebarOverview(@Headers('authorization') authorization: string | undefined) {
    const user = await this.authService.getCurrentUser(authorization);
    return ok(await this.feedService.getDynamicSidebarOverview(user?.id));
  }

  @Get('sidebar/recent-updates')
  async getRecentUpdates(@Headers('authorization') authorization: string | undefined) {
    const user = await this.authService.getCurrentUser(authorization);
    return ok(await this.feedService.getRecentUpdates(user?.id));
  }

  @Get('sidebar/recommended-users')
  async getRecommendedUsers(@Headers('authorization') authorization: string | undefined) {
    const user = await this.authService.getCurrentUser(authorization);
    return ok(await this.feedService.getRecommendedUsers(user?.id));
  }

  @Get('posts')
  async listPosts(
    @Headers('authorization') authorization: string | undefined,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const user = await this.authService.getCurrentUser(authorization);
    return ok(
      await this.dynamicPostsService.listPosts(
        user?.id,
        pageSize !== undefined ? Number(pageSize) : 20,
        page !== undefined ? (Math.max(1, Number(page)) - 1) * (pageSize !== undefined ? Number(pageSize) : 20) : 0,
      ),
    );
  }

  @Post('posts')
  async createPost(
    @Headers('authorization') authorization: string | undefined,
    @Body() dto: CreateDynamicPostDto,
  ) {
    const user = await this.authService.requireUser(authorization);
    const content = dto.content?.trim() ?? '';
    const images = (dto.images ?? []).map((item) => item.trim()).filter(Boolean);
    if (!content && images.length === 0) {
      throw new BadRequestException('Content or images are required');
    }
    return ok(await this.dynamicPostsService.createPost({ authorId: user.id, content, images }));
  }

  @Post('posts/:postId/like')
  async likePost(
    @Headers('authorization') authorization: string | undefined,
    @Param('postId', ParseIntPipe) postId: number,
  ) {
    const user = await this.authService.requireUser(authorization);
    return ok(await this.dynamicPostsService.likePost(postId, user));
  }

  @Delete('posts/:postId/like')
  async unlikePost(
    @Headers('authorization') authorization: string | undefined,
    @Param('postId', ParseIntPipe) postId: number,
  ) {
    const user = await this.authService.requireUser(authorization);
    return ok(await this.dynamicPostsService.unlikePost(postId, user));
  }

  @Get('posts/:postId/comments')
  async listComments(@Param('postId', ParseIntPipe) postId: number) {
    return ok(await this.dynamicPostsService.listComments(postId));
  }

  @Post('posts/:postId/comments')
  async createComment(
    @Headers('authorization') authorization: string | undefined,
    @Param('postId', ParseIntPipe) postId: number,
    @Body() dto: CreateDynamicPostCommentDto,
  ) {
    const user = await this.authService.requireUser(authorization);
    return ok(await this.dynamicPostsService.createComment(postId, user, dto.content ?? ''));
  }

  @Post('posts/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadPostImage(
    @Headers('authorization') authorization: string | undefined,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    await this.authService.requireUser(authorization);
    if (!file) {
      throw new BadRequestException('Image file is required');
    }
    return ok(await this.dynamicPostsService.uploadPostImage(file));
  }
}
