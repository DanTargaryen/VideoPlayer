import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { FollowModule } from '../follow/follow.module';
import { VideoModule } from '../video/video.module';
import { CreatorController } from './creator.controller';

@Module({
  imports: [AuthModule, VideoModule, FollowModule],
  controllers: [CreatorController],
})
export class CreatorModule {}
