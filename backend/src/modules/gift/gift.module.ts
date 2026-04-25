import { Module } from '@nestjs/common';

import { GiftController } from './gift.controller';

@Module({
  controllers: [GiftController],
})
export class GiftModule {}
