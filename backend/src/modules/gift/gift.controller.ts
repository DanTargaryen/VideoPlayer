import { Body, Controller, Get, Post } from '@nestjs/common';
import { IsInt, IsString } from 'class-validator';

import { ok } from '../../common/dto/api-response.dto';

class SendGiftDto {
  @IsInt()
  sessionId!: number;

  @IsInt()
  receiverId!: number;

  @IsString()
  giftName!: string;

  @IsInt()
  giftCost!: number;

  @IsInt()
  quantity!: number;
}

@Controller('gift-coins')
export class GiftController {
  @Get('wallet')
  getWallet() {
    return ok({
      balance: 100,
      totalClaimed: 100,
      totalSpent: 0,
    });
  }

  @Post('daily-claim')
  claimDaily() {
    return ok({
      claimed: true,
      amount: 10,
      balance: 110,
    });
  }

  @Post('send')
  sendGift(@Body() dto: SendGiftDto) {
    return ok({
      ...dto,
      balance: 90,
    });
  }
}
