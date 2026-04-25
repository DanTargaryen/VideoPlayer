import { BadRequestException, Body, Controller, Get, Headers, Post } from '@nestjs/common';
import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

import { ok } from '../../common/dto/api-response.dto';
import { EmailService } from '../email/email.service';
import { AuthService } from './auth.service';

class RegisterDto {
  @IsString()
  username!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsOptional()
  @IsString()
  nickname?: string;

  @IsOptional()
  @IsEmail({}, { message: '邮箱格式不正确' })
  @MaxLength(128)
  email?: string;
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

  @IsEmail({}, { message: '邮箱格式不正确' })
  @MaxLength(128)
  email!: string;

  @IsString()
  @MaxLength(10)
  emailCode!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(64)
  newPassword!: string;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly emailService: EmailService,
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
    const isCodeValid = this.emailService.verifyCode(dto.email, dto.emailCode);
    if (!isCodeValid) {
      throw new BadRequestException('邮箱验证码不正确');
    }

    const result = await this.authService.resetPasswordByEmail(dto.username, dto.email, dto.newPassword);
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
    });
  }
}
