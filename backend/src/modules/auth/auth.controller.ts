import { BadRequestException, Body, Controller, Get, Headers, Post } from '@nestjs/common';
import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

import { ok } from '../../common/dto/api-response.dto';
import { AuthService } from './auth.service';
import { SmsService } from '../sms/sms.service';

class RegisterDto {
  @IsString()
  username!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsOptional()
  @IsString()
  nickname?: string;
}

class LoginDto {
  @IsOptional()
  @IsString()
  account?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsString()
  adminSecret?: string;
}

class ResetPasswordDto {
  @IsString()
  @MaxLength(64)
  username!: string;

  @IsString()
  @MaxLength(20)
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone!: string;

  @IsString()
  @MaxLength(10)
  smsCode!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(64)
  newPassword!: string;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly smsService: SmsService,
  ) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return ok(await this.authService.register(dto));
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return ok(await this.authService.login(dto.account, dto.password, dto.adminSecret));
  }

  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    const isCodeValid = this.smsService.verifyCode(dto.phone, dto.smsCode);
    if (!isCodeValid) {
      throw new BadRequestException('手机验证码不正确');
    }

    const result = await this.authService.resetPasswordByPhone(dto.username, dto.phone, dto.newPassword);
    return ok(result);
  }

  @Get('me')
  async me(@Headers('authorization') authorization?: string) {
    const user = await this.authService.requireUser(authorization);

    return ok({
      id: user.id,
      username: user.username,
      role: user.role,
      nickname: user.nickname,
      email: user.email,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      phone: user.phone,
    });
  }
}
