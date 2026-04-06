import { Body, Controller, Get, Headers, Param, ParseIntPipe, Put } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';

import { ok } from '../../common/dto/api-response.dto';
import { AuthService } from '../auth/auth.service';
import { UserService } from './user.service';

class UpdateProfileDto {
  @IsOptional()
  @IsString()
  nickname?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  bio?: string;
}

@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService,
  ) {}

  @Put('profile')
  updateProfile(@Body() dto: UpdateProfileDto) {
    return ok(this.userService.updateProfile(dto));
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
