import { Controller, Get, Headers, Post } from '@nestjs/common';

import { ok } from '../../common/dto/api-response.dto';
import { AuthService } from '../auth/auth.service';
import { GiftService } from './gift.service';

@Controller('gift-coins')
export class GiftController {
  constructor(
    private readonly authService: AuthService,
    private readonly giftService: GiftService,
  ) {}

  @Get('wallet')
  async getWallet(@Headers('authorization') authorization: string | undefined) {
    const user = await this.authService.requireUser(authorization);
    return ok(await this.giftService.getWallet(user.id));
  }

  @Post('daily-claim')
  async claimDaily(@Headers('authorization') authorization: string | undefined) {
    const user = await this.authService.requireUser(authorization);
    return ok(await this.giftService.claimDaily(user.id));
  }
}
