import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { AiController } from './ai.controller';
import { AiSummaryService } from './ai-summary.service';
import { FrameExtractService } from './frame-extract.service';
import { VideoAiSummaryRepository } from './video-ai-summary.repository';
import { VideoAiSummaryService } from './video-ai-summary.service';
import { AiVideoService } from './video.service';

@Module({
  imports: [PrismaModule, StorageModule],
  controllers: [AiController],
  providers: [
    AiVideoService,
    FrameExtractService,
    AiSummaryService,
    VideoAiSummaryRepository,
    VideoAiSummaryService,
  ],
  exports: [AiSummaryService, VideoAiSummaryService],
})
export class AiModule {}
