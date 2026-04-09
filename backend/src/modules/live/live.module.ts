import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { VideoModule } from '../video/video.module';
import { LiveController } from './live.controller';
import { LiveService } from './live.service';

@Module({
  imports: [AuthModule, PrismaModule, VideoModule],
  controllers: [LiveController],
  providers: [LiveService],
  exports: [LiveService],
})
export class LiveModule {}
