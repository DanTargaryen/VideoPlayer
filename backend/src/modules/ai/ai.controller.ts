import { Body, Controller, Post } from '@nestjs/common';

import { ok } from '../../common/dto/api-response.dto';
import { CreateVideoChatDto } from './dto/create-video-chat.dto';
import { CreateVideoSummaryDto } from './dto/create-video-summary.dto';
import { VideoAiSummaryService } from './video-ai-summary.service';

@Controller('ai')
export class AiController {
  constructor(private readonly videoAiSummaryService: VideoAiSummaryService) {}

  @Post('video-summary')
  async summarizeVideo(@Body() dto: CreateVideoSummaryDto) {
    return ok(await this.videoAiSummaryService.summarizeVideo(dto.videoId));
  }

  @Post('video-chat')
  async chatVideo(@Body() dto: CreateVideoChatDto) {
    return ok(await this.videoAiSummaryService.chatWithVideo(dto.videoId, dto.prompt));
  }
}
