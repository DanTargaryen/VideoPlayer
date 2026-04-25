import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { GiftController } from './gift.controller';
import { GiftService } from './gift.service';

@Module({
  imports: [AuthModule],
  controllers: [GiftController],
  providers: [GiftService],
})
export class GiftModule {}
