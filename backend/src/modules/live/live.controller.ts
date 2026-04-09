import { Body, Controller, Delete, Get, Headers, Param, ParseIntPipe, Post, Query, Res } from '@nestjs/common';
import { IsIn, IsInt, IsOptional, IsString } from 'class-validator';
import type { Response } from 'express';

import { ok } from '../../common/dto/api-response.dto';
import { AuthService } from '../auth/auth.service';
import { LiveService } from './live.service';

class CreateRoomDto {
  @IsString()
  title!: string;

  @IsInt()
  categoryId!: number;

  @IsOptional()
  @IsString()
  coverUrl?: string;

  @IsOptional()
  @IsIn(['camera', 'screen'])
  sourceMode?: 'camera' | 'screen';
}

class SessionDescriptionDto {
  @IsString()
  @IsIn(['offer', 'answer'])
  type!: 'offer' | 'answer';

  @IsString()
  sdp!: string;
}

class LiveMessageDto {
  @IsString()
  content!: string;
}

@Controller('lives')
export class LiveController {
  constructor(
    private readonly liveService: LiveService,
    private readonly authService: AuthService,
  ) {}

  @Post('rooms')
  async createRoom(@Headers('authorization') authorization: string | undefined, @Body() dto: CreateRoomDto) {
    const user = await this.authService.requireUser(authorization);
    return ok(this.liveService.createRoom(user, dto));
  }

  @Get('rooms')
  listRooms(
    @Query('keyword') keyword?: string,
    @Query('status') status?: 'IDLE' | 'LIVING' | 'ENDED',
    @Query('categoryId') categoryId?: string,
    @Query('broadcasterId') broadcasterId?: string,
    @Query('limit') limit?: string,
  ) {
    return ok(
      this.liveService.listRooms({
        keyword,
        status,
        categoryId: categoryId !== undefined ? Number(categoryId) : undefined,
        broadcasterId: broadcasterId !== undefined ? Number(broadcasterId) : undefined,
        limit: limit !== undefined ? Number(limit) : undefined,
      }),
    );
  }

  @Get('rooms/:id')
  getRoom(@Param('id', ParseIntPipe) id: number) {
    return ok(this.liveService.getRoom(id));
  }

  @Post('rooms/:id/start')
  async startRoom(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const user = await this.authService.requireUser(authorization);
    return ok(this.liveService.startRoom(id, user));
  }

  @Post('rooms/:id/stop')
  async stopRoom(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const user = await this.authService.requireUser(authorization);
    return ok(this.liveService.stopRoom(id, user));
  }

  @Post('rooms/:id/viewers')
  createViewer(@Param('id', ParseIntPipe) id: number) {
    return ok(this.liveService.createViewer(id));
  }

  @Delete('rooms/:id/viewers/:viewerId')
  removeViewer(
    @Param('id', ParseIntPipe) id: number,
    @Param('viewerId', ParseIntPipe) viewerId: number,
  ) {
    return ok(this.liveService.removeViewer(id, viewerId));
  }

  @Post('rooms/:id/viewers/:viewerId/offer')
  submitViewerOffer(
    @Param('id', ParseIntPipe) id: number,
    @Param('viewerId', ParseIntPipe) viewerId: number,
    @Body() dto: SessionDescriptionDto,
  ) {
    return ok(this.liveService.submitViewerOffer(id, viewerId, dto));
  }

  @Get('rooms/:id/publisher/pending-viewers')
  async getPendingViewers(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const user = await this.authService.requireUser(authorization);
    return ok(this.liveService.getPendingViewers(id, user));
  }

  @Post('rooms/:id/viewers/:viewerId/answer')
  async submitViewerAnswer(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', ParseIntPipe) id: number,
    @Param('viewerId', ParseIntPipe) viewerId: number,
    @Body() dto: SessionDescriptionDto,
  ) {
    const user = await this.authService.requireUser(authorization);
    return ok(this.liveService.submitViewerAnswer(id, viewerId, user, dto));
  }

  @Get('rooms/:id/viewers/:viewerId/answer')
  getViewerAnswer(
    @Param('id', ParseIntPipe) id: number,
    @Param('viewerId', ParseIntPipe) viewerId: number,
  ) {
    return ok(this.liveService.getViewerAnswer(id, viewerId));
  }

  @Get('rooms/:id/messages')
  listMessages(@Param('id', ParseIntPipe) id: number) {
    return ok(this.liveService.listMessages(id));
  }

  @Post('rooms/:id/messages')
  async createMessage(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: LiveMessageDto,
  ) {
    const user = await this.authService.requireUser(authorization);
    return ok(this.liveService.createMessage(id, user, dto));
  }

  @Get('rooms/:id/events')
  streamRoomFeed(@Param('id', ParseIntPipe) id: number, @Res() response: Response) {
    this.liveService.subscribeRoomFeed(id, response);
  }

  @Get('rooms/:id/publisher/events')
  async streamPublisherSignals(
    @Headers('authorization') authorization: string | undefined,
    @Query('token') token: string | undefined,
    @Param('id', ParseIntPipe) id: number,
    @Res() response: Response,
  ) {
    const user = await this.authService.requireUser(authorization ?? (token ? `Bearer ${token}` : undefined));
    this.liveService.subscribePublisherSignals(id, user, response);
  }

  @Get('rooms/:id/viewers/:viewerId/events')
  streamViewerSignals(
    @Param('id', ParseIntPipe) id: number,
    @Param('viewerId', ParseIntPipe) viewerId: number,
    @Res() response: Response,
  ) {
    this.liveService.subscribeViewerSignals(id, viewerId, response);
  }

  @Get('sessions/:id')
  getSession(@Param('id', ParseIntPipe) id: number) {
    return ok(this.liveService.getSession(id));
  }
}
