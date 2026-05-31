import { Module } from '@nestjs/common';

import { AiModule } from '../ai/ai.module';
import { AssistantController } from './assistant.controller';
import { AssistantService } from './assistant.service';
import { SiteKnowledgeService } from './site-knowledge.service';

@Module({
  imports: [AiModule],
  controllers: [AssistantController],
  providers: [AssistantService, SiteKnowledgeService],
})
export class AssistantModule {}
