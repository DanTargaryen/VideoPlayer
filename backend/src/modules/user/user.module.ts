import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { FollowModule } from '../follow/follow.module';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { UserController } from './user.controller';
import { UserProfileService } from './user-profile.service';
import { UserService } from './user.service';

@Module({
  imports: [AuthModule, FollowModule, StorageModule, PrismaModule],
  controllers: [UserController],
  providers: [UserService, UserProfileService],
  exports: [UserService, UserProfileService],
})
export class UserModule {}
