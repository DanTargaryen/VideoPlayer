import { Body, Controller, Headers, Post } from '@nestjs/common';
import { IsIn, IsInt, IsString, MaxLength, MinLength } from 'class-validator';

import { ok } from '../../common/dto/api-response.dto';
import { AuthService } from '../auth/auth.service';
import { ReportService } from './report.service';

class CreateReportDto {
  @IsString()
  @IsIn(['VIDEO', 'COMMENT', 'VIDEO_DANMAKU'])
  targetType!: 'VIDEO' | 'COMMENT' | 'VIDEO_DANMAKU';

  @IsInt()
  targetId!: number;

  @IsString()
  @MinLength(2)
  @MaxLength(255)
  reason!: string;
}

@Controller('reports')
export class ReportController {
  constructor(
    private readonly authService: AuthService,
    private readonly reportService: ReportService,
  ) {}

  @Post()
  async createReport(
    @Headers('authorization') authorization: string | undefined,
    @Body() dto: CreateReportDto,
  ) {
    const user = await this.authService.requireUser(authorization);
    return ok(await this.reportService.createReport(user, dto));
  }
}
