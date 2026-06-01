import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

class AssistantContextDto {
  @IsOptional()
  @IsString()
  @MaxLength(256)
  path?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  routeName?: string;

  @IsOptional()
  @IsInt()
  videoId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  videoTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  keyword?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

class AssistantHistoryMessageDto {
  @IsIn(['user', 'assistant'])
  role!: 'user' | 'assistant';

  @IsString()
  @MaxLength(2000)
  content!: string;
}

export class CreateAssistantChatDto {
  @IsString()
  @MaxLength(2000)
  message!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  conversationId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => AssistantContextDto)
  context?: AssistantContextDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssistantHistoryMessageDto)
  history?: AssistantHistoryMessageDto[];
}
