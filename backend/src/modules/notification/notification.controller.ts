import { Controller, Get, Headers, Post } from '@nestjs/common';

import { ok } from '../../common/dto/api-response.dto';
import { AuthService } from '../auth/auth.service';
import { NotificationService } from './notification.service';

@Controller('notifications')
export class NotificationController {
  constructor(
    private readonly authService: AuthService,
    private readonly notificationService: NotificationService,
  ) {}

  @Get()
  async listNotifications(@Headers('authorization') authorization: string | undefined) {
    const user = await this.authService.requireUser(authorization);
    return ok(await this.notificationService.listNotifications(user.id));
  }

  @Get('unread-count')
  async unreadCount(@Headers('authorization') authorization: string | undefined) {
    const user = await this.authService.requireUser(authorization);
    return ok(await this.notificationService.getUnreadCount(user.id));
  }

  @Post('read-all')
  async readAll(@Headers('authorization') authorization: string | undefined) {
    const user = await this.authService.requireUser(authorization);
    return ok(await this.notificationService.markAllAsRead(user.id));
  }
}
