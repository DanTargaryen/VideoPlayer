import { Global, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SmsController } from './sms.controller';
import { SmsService } from './sms.service';

@Global()
@Module({
  imports: [AuthModule],
  controllers: [SmsController],
  providers: [SmsService],
  exports: [SmsService],
})
export class SmsModule {}