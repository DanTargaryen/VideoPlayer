import { Controller, Delete, Get, Headers, Param, ParseIntPipe, Post } from '@nestjs/common';

import { ok } from '../../common/dto/api-response.dto';
import { AuthService } from '../auth/auth.service';
import { FollowService } from './follow.service';

@Controller()
export class FollowController {
  constructor(
    private readonly authService: AuthService,
    private readonly followService: FollowService,
  ) {}

  @Post('users/:id/follow')
  async follow(@Headers('authorization') authorization: string | undefined, @Param('id', ParseIntPipe) id: number) {
    const user = await this.authService.requireUser(authorization);
    return ok(await this.followService.follow(id, user));
  }

  @Delete('users/:id/follow')
  async unfollow(@Headers('authorization') authorization: string | undefined, @Param('id', ParseIntPipe) id: number) {
    const user = await this.authService.requireUser(authorization);
    return ok(await this.followService.unfollow(id, user));
  }

  @Get('feeds/following')
  async getFollowingFeed(@Headers('authorization') authorization: string | undefined) {
    const user = await this.authService.requireUser(authorization);
    return ok(await this.followService.getFollowingFeed(user));
  }
}
