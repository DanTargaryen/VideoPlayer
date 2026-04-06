import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { VideoModule } from '../video/video.module';
import { CreatorController } from './creator.controller';

@Module({
  imports: [AuthModule, VideoModule],
  controllers: [CreatorController],
})
export class CreatorModule {}
