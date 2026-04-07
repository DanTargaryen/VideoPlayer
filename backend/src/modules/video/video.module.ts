import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { FollowModule } from '../follow/follow.module';
import { VideoController } from './video.controller';
import { MediaService } from './media.service';
import { VideoService } from './video.service';

@Module({
  imports: [AuthModule, FollowModule],
  controllers: [VideoController],
  providers: [VideoService, MediaService],
  exports: [VideoService],
})
export class VideoModule {}
