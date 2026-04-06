import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { IsObject, IsOptional, IsString } from 'class-validator';

import { ok } from '../../common/dto/api-response.dto';

class ReviewPreviewDto {
  @IsString()
  targetType!: string;

  @IsString()
  content!: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

@Controller('agent')
export class AgentController {
  @Post('review-preview')
  reviewPreview(@Body() dto: ReviewPreviewDto) {
    return ok({
      targetType: dto.targetType,
      riskLevel: 'LOW',
      suggestedAction: 'MANUAL_REVIEW',
      summary: 'Mock agent output for development.',
      hitRules: [],
    });
  }

  @Get('results')
  getResults(@Query('targetType') targetType?: string, @Query('targetId') targetId?: string) {
    return ok({
      targetType,
      targetId,
      results: [],
    });
  }
}
