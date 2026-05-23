import { Controller, Get, Headers, Query } from '@nestjs/common';

import { ok } from '../../common/dto/api-response.dto';
import { AuthService } from '../auth/auth.service';
import { FeedService, type DynamicFeedType } from './feed.service';

@Controller('feed')
export class FeedController {
  constructor(
    private readonly authService: AuthService,
    private readonly feedService: FeedService,
  ) {}

  @Get('dynamic')
  async getDynamicFeed(
    @Headers('authorization') authorization: string | undefined,
    @Query('type') type?: DynamicFeedType,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const user = await this.authService.getCurrentUser(authorization);
    return ok(
      await this.feedService.getDynamicFeed({
        currentUserId: user?.id,
        type,
        page: page !== undefined ? Number(page) : undefined,
        pageSize: pageSize !== undefined ? Number(pageSize) : undefined,
      }),
    );
  }

  @Get('sidebar/live')
  async getSidebarLive(@Headers('authorization') authorization: string | undefined) {
    const user = await this.authService.getCurrentUser(authorization);
    return ok(await this.feedService.getSidebarLive(user?.id));
  }

  @Get('sidebar/recent-updates')
  async getRecentUpdates(@Headers('authorization') authorization: string | undefined) {
    const user = await this.authService.getCurrentUser(authorization);
    return ok(await this.feedService.getRecentUpdates(user?.id));
  }

  @Get('sidebar/recommended-users')
  async getRecommendedUsers(@Headers('authorization') authorization: string | undefined) {
    const user = await this.authService.getCurrentUser(authorization);
    return ok(await this.feedService.getRecommendedUsers(user?.id));
  }
}
