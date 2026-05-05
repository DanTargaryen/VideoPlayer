import { Body, Controller, Get, Headers, Param, ParseIntPipe, Post } from '@nestjs/common';
import { IsString, MaxLength } from 'class-validator';

import { ok } from '../../common/dto/api-response.dto';
import { AuthService } from '../auth/auth.service';
import { MessageService } from './message.service';

class SendDirectMessageDto {
  @IsString()
  @MaxLength(1000)
  content!: string;
}

@Controller('messages')
export class MessageController {
  constructor(
    private readonly authService: AuthService,
    private readonly messageService: MessageService,
  ) {}

  @Get('conversations')
  async listConversations(@Headers('authorization') authorization?: string) {
    const user = await this.authService.requireUser(authorization);
    return ok(await this.messageService.listConversations(user.id));
  }

  @Get('conversations/:targetUserId')
  async getConversation(
    @Headers('authorization') authorization: string | undefined,
    @Param('targetUserId', ParseIntPipe) targetUserId: number,
  ) {
    const user = await this.authService.requireUser(authorization);
    return ok(await this.messageService.getConversation(user.id, targetUserId));
  }

  @Post('conversations/:targetUserId')
  async sendMessage(
    @Headers('authorization') authorization: string | undefined,
    @Param('targetUserId', ParseIntPipe) targetUserId: number,
    @Body() dto: SendDirectMessageDto,
  ) {
    const user = await this.authService.requireUser(authorization);
    return ok(await this.messageService.sendMessage(user, targetUserId, dto.content));
  }

  @Get('unread-count')
  async getUnreadCount(@Headers('authorization') authorization?: string) {
    const user = await this.authService.requireUser(authorization);
    return ok(await this.messageService.getUnreadCount(user.id));
  }
}
