import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { FollowModule } from '../follow/follow.module';
import { StorageModule } from '../storage/storage.module';
import { UserModule } from '../user/user.module';
import { VideoController } from './video.controller';
import { MediaService } from './media.service';
import { VideoService } from './video.service';

@Module({
  imports: [AuthModule, FollowModule, StorageModule, UserModule],
  controllers: [VideoController],
  providers: [VideoService, MediaService],
  exports: [VideoService],
})
export class VideoModule {}
