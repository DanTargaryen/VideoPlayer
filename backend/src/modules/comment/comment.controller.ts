import { Body, Controller, Get, Headers, Param, ParseIntPipe, Post } from '@nestjs/common';
import { IsInt, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

import { ok } from '../../common/dto/api-response.dto';
import { AuthService } from '../auth/auth.service';
import { CommentService } from './comment.service';

class CreateCommentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  content!: string;

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

  @Post()
  async createComment(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateCommentDto,
  ) {
    const user = await this.authService.requireUser(authorization);
    return ok(await this.commentService.createComment(id, user, dto));
  }
}
