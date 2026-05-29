import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { FollowModule } from '../follow/follow.module';
import { LiveModule } from '../live/live.module';
import { PrismaModule } from '../prisma/prisma.module';
import { VideoModule } from '../video/video.module';
import { DynamicPostsService } from './dynamic-posts.service';
import { FeedController } from './feed.controller';
import { FeedService } from './feed.service';

@Module({
  imports: [AuthModule, FollowModule, LiveModule, PrismaModule, VideoModule],
  controllers: [FeedController],
  providers: [FeedService, DynamicPostsService],
})
export class FeedModule {}
