import { Module } from '@nestjs/common';

import { AiModule } from '../ai/ai.module';
import { CommentAiService } from './comment-ai.service';
import { CommentAiWorkerService } from './comment-ai.worker';
import { GrokBotService } from './grok-bot.service';

@Module({
  imports: [AiModule],
  providers: [GrokBotService, CommentAiService, CommentAiWorkerService],
  exports: [CommentAiService, GrokBotService],
})
export class CommentAiModule {}
