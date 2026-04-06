import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { IsInt, IsOptional, IsString } from 'class-validator';

import { ok } from '../../common/dto/api-response.dto';
import { LiveService } from './live.service';

class CreateRoomDto {
  @IsString()
  title!: string;

  @IsInt()
  categoryId!: number;

  @IsOptional()
  @IsString()
  coverUrl?: string;
}

@Controller('lives')
export class LiveController {
  constructor(private readonly liveService: LiveService) {}

  @Post('rooms')
  createRoom(@Body() dto: CreateRoomDto) {
    return ok(this.liveService.createRoom(dto));
  }

  @Post('rooms/:id/start')
  startRoom(@Param('id', ParseIntPipe) id: number) {
    return ok(this.liveService.startRoom(id));
  }

  @Get('sessions/:id')
  getSession(@Param('id', ParseIntPipe) id: number) {
    return ok(this.liveService.getSession(id));
  }
}
