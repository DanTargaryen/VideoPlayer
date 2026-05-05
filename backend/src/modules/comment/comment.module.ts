import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { CommentAiModule } from '../comment-ai/comment-ai.module';
import { CommentController } from './comment.controller';
import { CommentService } from './comment.service';

@Module({
  imports: [AuthModule, CommentAiModule],
  controllers: [CommentController],
  providers: [CommentService],
  exports: [CommentService],
})
export class CommentModule {}
