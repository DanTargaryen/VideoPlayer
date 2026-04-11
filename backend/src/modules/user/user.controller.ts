import { Body, Controller, Get, Headers, Param, ParseIntPipe, Put } from '@nestjs/common';
import { IsOptional, IsString, MaxLength } from 'class-validator';

import { ok } from '../../common/dto/api-response.dto';
import { AuthService } from '../auth/auth.service';
import { UserService } from './user.service';

class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  nickname?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  bio?: string;
}

@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService,
  ) {}

  @Put('profile')
  async updateProfile(
    @Headers('authorization') authorization: string | undefined,
    @Body() dto: UpdateProfileDto,
  ) {
    const user = await this.authService.requireUser(authorization);
    return ok(await this.userService.updateProfile(user.id, dto));
  }

  @Get(':id/homepage')
  async getHomepage(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const user = await this.authService.getCurrentUser(authorization);
    return ok(await this.userService.getHomepage(id, user?.id));
  }
}
