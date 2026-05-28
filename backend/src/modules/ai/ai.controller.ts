import { Body, Controller, Get, Headers, Param, ParseIntPipe, Post } from '@nestjs/common';

import { ok } from '../../common/dto/api-response.dto';
import { AuthService } from '../auth/auth.service';
import { CreateVideoChatDto } from './dto/create-video-chat.dto';
import { CreateVideoSummaryDto } from './dto/create-video-summary.dto';
import { VideoAiSummaryService } from './video-ai-summary.service';

@Controller('ai')
export class AiController {
  constructor(
    private readonly authService: AuthService,
    private readonly videoAiSummaryService: VideoAiSummaryService,
  ) {}

  @Post('video-summary')
  async summarizeVideo(@Body() dto: CreateVideoSummaryDto) {
    return ok(await this.videoAiSummaryService.summarizeVideo(dto.videoId));
  }

  @Post('video-chat')
  async chatVideo(@Headers('authorization') authorization: string | undefined, @Body() dto: CreateVideoChatDto) {
    const user = await this.authService.requireUser(authorization);
    return ok(await this.videoAiSummaryService.chatWithVideo(dto.videoId, dto.prompt, user.id));
  }

  @Get('video-chat/:videoId')
  async getVideoChatHistory(
    @Headers('authorization') authorization: string | undefined,
    @Param('videoId', ParseIntPipe) videoId: number,
  ) {
    const user = await this.authService.requireUser(authorization);
    return ok(await this.videoAiSummaryService.getChatHistory(videoId, user.id));
  }
}
