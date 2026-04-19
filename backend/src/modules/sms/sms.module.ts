import { Global, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CaptchaModule } from '../captcha/captcha.module';
import { SmsController } from './sms.controller';
import { SmsService } from './sms.service';

@Global()
@Module({
  imports: [AuthModule, CaptchaModule],
  controllers: [SmsController],
  providers: [SmsService],
  exports: [SmsService],
})
export class SmsModule {}