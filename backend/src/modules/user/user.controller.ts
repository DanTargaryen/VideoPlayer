import { BadRequestException, Body, Controller, Get, Headers, Param, ParseIntPipe, Post, Put, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsOptional, IsString, MaxLength } from 'class-validator';

import { ok } from '../../common/dto/api-response.dto';
import { AuthService } from '../auth/auth.service';
import { MinioService } from '../storage/minio.service';
import { PrismaService } from '../prisma/prisma.service';
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
    private readonly minioService: MinioService,
    private readonly prisma: PrismaService,
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

  @Get(':id/homepage')
  async getHomepage(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const user = await this.authService.getCurrentUser(authorization);
    return ok(await this.userService.getHomepage(id, user?.id));
  }
}
