import { Controller, Get, Headers } from '@nestjs/common';

import { ok } from '../../common/dto/api-response.dto';
import { AuthService } from '../auth/auth.service';
import { VideoService } from '../video/video.service';

@Controller('creator')
export class CreatorController {
  constructor(
    private readonly authService: AuthService,
    private readonly videoService: VideoService,
  ) {}

  @Get('dashboard')
  async getDashboard(@Headers('authorization') authorization?: string) {
    const user = await this.authService.requireUser(authorization);
    const counts = await this.videoService.countVideosByStatus(user.id);

    return ok({
      nickname: user.nickname,
      role: user.role,
      ...counts,
    });
  }

  @Get('videos')
  async getMyVideos(@Headers('authorization') authorization?: string) {
    const user = await this.authService.requireUser(authorization);
    return ok(await this.videoService.getCreatorVideos(user));
  }
}
