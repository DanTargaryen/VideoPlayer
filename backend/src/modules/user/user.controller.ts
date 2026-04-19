import { BadRequestException, Body, Controller, Delete, Get, Headers, Param, ParseIntPipe, Post, Put, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Express } from 'express';
import { IsOptional, IsString, MaxLength, Matches } from 'class-validator';

class DeleteAccountDto {
  @IsString()
  password!: string;
}

import { ok } from '../../common/dto/api-response.dto';
import { AuthService } from '../auth/auth.service';
import { MinioService } from '../storage/minio.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserProfileService } from './user-profile.service';
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

  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone?: string;
}

@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService,
    private readonly minioService: MinioService,
    private readonly prisma: PrismaService,
    private readonly userProfileService: UserProfileService,
  ) {}

  @Post('avatar')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @Headers('authorization') authorization: string | undefined,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const user = await this.authService.requireUser(authorization);
    if (!file) {
      throw new BadRequestException('Avatar file is required');
    }
    const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, '/');
    const objectKey = `avatars/${datePrefix}/${Date.now()}-${file.originalname}`;
    const uploaded = await this.minioService.uploadObject({
      objectKey,
      buffer: file.buffer,
      size: file.size,
      mimeType: file.mimetype,
      originalName: file.originalname,
    });
    await this.prisma.user.update({
      where: { id: user.id },
      data: { avatarUrl: uploaded.url },
    });
    return ok({ avatarUrl: uploaded.url });
  }

  @Put('profile')
  async updateProfile(
    @Headers('authorization') authorization: string | undefined,
    @Body() dto: UpdateProfileDto,
  ) {
    const user = await this.authService.requireUser(authorization);
    return ok(await this.userService.updateProfile(user.id, dto));
  }

  @Get('profile/recommendation')
  async getRecommendationProfile(@Headers('authorization') authorization: string | undefined) {
    const user = await this.authService.requireUser(authorization);
    return ok(await this.userProfileService.getProfile(user.id, true));
  }

  @Post('profile/recommendation/rebuild')
  async rebuildRecommendationProfile(@Headers('authorization') authorization: string | undefined) {
    const user = await this.authService.requireUser(authorization);
    return ok(await this.userProfileService.buildAndSaveProfile(user.id));
  }

  @Delete('me')
  async deleteAccount(
    @Headers('authorization') authorization: string | undefined,
    @Body() dto: DeleteAccountDto,
  ) {
    const user = await this.authService.requireUser(authorization);
    await this.userService.deleteAccount(user.id, dto.password);
    return ok({ deleted: true });
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
