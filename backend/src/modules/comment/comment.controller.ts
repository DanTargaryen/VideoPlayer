import { BadRequestException, Body, Controller, Get, Headers, Param, ParseIntPipe, Post } from '@nestjs/common';
import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

import { ok } from '../../common/dto/api-response.dto';
import { AuthService } from '../auth/auth.service';
import { CommentService } from './comment.service';

class CreateCommentDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  content!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  imageUrl?: string;

  @IsOptional()
  @IsInt()
  parentId?: number;

  @IsOptional()
  @IsInt()
  rootId?: number;
}

@Controller('videos/:id/comments')
export class CommentController {
  constructor(
    private readonly authService: AuthService,
    private readonly commentService: CommentService,
  ) {}

  @Get()
  async getComments(@Param('id', ParseIntPipe) id: number) {
    return ok(await this.commentService.listComments(id));
  }

  @Get(':rootId/thread')
  async getCommentThread(
    @Param('id', ParseIntPipe) id: number,
    @Param('rootId', ParseIntPipe) rootId: number,
  ) {
    return ok(await this.commentService.getCommentThread(id, rootId));
  }

  @Post()
  async createComment(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateCommentDto,
  ) {
    const content = dto.content?.trim() ?? '';
    const imageUrl = dto.imageUrl?.trim() ?? '';
    if (!content && !imageUrl) {
      throw new BadRequestException('Comment content or image is required');
    }

    const user = await this.authService.requireUser(authorization);
    return ok(
      await this.commentService.createComment(id, user, {
        ...dto,
        content,
        imageUrl: imageUrl || undefined,
      }),
    );
  }
}
