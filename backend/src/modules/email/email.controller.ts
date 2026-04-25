import { BadRequestException, Body, Controller, Headers, Post } from '@nestjs/common';
import { IsEmail, IsString, MaxLength } from 'class-validator';

import { ok } from '../../common/dto/api-response.dto';
import { AuthService } from '../auth/auth.service';
import { CaptchaService } from '../captcha/captcha.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from './email.service';

class SendCodeDto {
  @IsEmail({}, { message: '邮箱格式不正确' })
  @MaxLength(128)
  email!: string;
}

class SendResetCodeDto {
  @IsString()
  @MaxLength(64)
  username!: string;

  @IsEmail({}, { message: '邮箱格式不正确' })
  @MaxLength(128)
  email!: string;

  @IsString()
  captchaId!: string;

  @IsString()
  captchaCode!: string;
}

class VerifyCodeDto {
  @IsEmail({}, { message: '邮箱格式不正确' })
  @MaxLength(128)
  email!: string;

  @IsString()
  @MaxLength(10)
  code!: string;
}

@Controller('email')
export class EmailController {
  constructor(
    private readonly emailService: EmailService,
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
    console.log(`[Email] User ${user.id} requesting email code for ${dto.email}`);
    await this.emailService.generateCode(dto.email);
    return ok({ message: '验证码已发送' });
  }

  @Post('send-reset-code')
  async sendResetCode(@Body() dto: SendResetCodeDto) {
    const isCaptchaValid = this.captchaService.verifyCaptcha(dto.captchaId, dto.captchaCode);
    if (!isCaptchaValid) {
      throw new BadRequestException('图形验证码不正确');
    }

    const user = await this.prisma.user.findFirst({
      where: { username: dto.username, email: dto.email },
    });

    if (!user) {
      throw new BadRequestException('邮箱不正确');
    }

    console.log(`[Email] Password reset request for user ${dto.username}, email ${dto.email}`);
    await this.emailService.generateCode(dto.email);
    return ok({ message: '验证码已发送' });
  }

  @Post('verify-code')
  async verifyCode(@Body() dto: VerifyCodeDto) {
    const isValid = this.emailService.verifyCode(dto.email, dto.code);
    if (!isValid) {
      throw new BadRequestException('验证码无效或已过期');
    }
    return ok({ message: '验证码校验成功' });
  }
}
