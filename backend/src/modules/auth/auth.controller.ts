import { Body, Controller, Get, Headers, Post } from '@nestjs/common';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

import { ok } from '../../common/dto/api-response.dto';
import { AuthService } from './auth.service';

class RegisterDto {
  @IsString()
  username!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsOptional()
  @IsString()
  nickname?: string;
}

class LoginDto {
  @IsString()
  account!: string;

  @IsString()
  password!: string;

  @IsOptional()
  @IsString()
  adminSecret?: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return ok(await this.authService.register(dto));
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return ok(await this.authService.login(dto.account, dto.password, dto.adminSecret));
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
    });
  }
}
