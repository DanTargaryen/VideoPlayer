import { BadRequestException, Body, Controller, Headers, Post } from '@nestjs/common';
import { IsString, Matches, MaxLength } from 'class-validator';
import { ok } from '../../common/dto/api-response.dto';
import { AuthService } from '../auth/auth.service';
import { CaptchaService } from '../captcha/captcha.service';
import { SmsService } from './sms.service';
import { PrismaService } from '../prisma/prisma.service';

class SendCodeDto {
  @IsString()
  @MaxLength(20)
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone!: string;
}

class SendResetCodeDto {
  @IsString()
  @MaxLength(64)
  username!: string;

  @IsString()
  @MaxLength(20)
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone!: string;

  @IsString()
  captchaId!: string;

  @IsString()
  captchaCode!: string;
}

class VerifyCodeDto {
  @IsString()
  @MaxLength(20)
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone!: string;

  @IsString()
  @MaxLength(10)
  code!: string;
}

@Controller('sms')
export class SmsController {
  constructor(
    private readonly smsService: SmsService,
    private readonly authService: AuthService,
    private readonly captchaService: CaptchaService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('send-code')
  async sendCode(
    @Headers('authorization') authorization: string | undefined,
    @Body() dto: SendCodeDto,
  ) {
    const user = await this.authService.requireUser(authorization);
    console.log(`[SMS] User ${user.id} requesting SMS code for phone ${dto.phone}`);
    this.smsService.generateCode(dto.phone);
    return ok({ message: '验证码已发送' });
  }

  @Post('send-reset-code')
  async sendResetCode(@Body() dto: SendResetCodeDto) {
    const isCaptchaValid = this.captchaService.verifyCaptcha(dto.captchaId, dto.captchaCode);
    if (!isCaptchaValid) {
      throw new BadRequestException('图形验证码错误或已过期');
    }

    const user = await this.prisma.user.findFirst({
      where: { username: dto.username, phone: dto.phone },
    });

    if (!user) {
      throw new BadRequestException('用户名与手机号不匹配');
    }

    console.log(`[SMS] Password reset request for user ${dto.username}, phone ${dto.phone}`);
    this.smsService.generateCode(dto.phone);
    return ok({ message: '验证码已发送' });
  }

  @Post('verify-code')
  async verifyCode(@Body() dto: VerifyCodeDto) {
    const isValid = this.smsService.verifyCode(dto.phone, dto.code);
    if (!isValid) {
      throw new BadRequestException('验证码无效或已过期');
    }
    return ok({ message: '验证码校验成功' });
  }
}