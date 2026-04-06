import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { FollowModule } from '../follow/follow.module';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  imports: [AuthModule, FollowModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
