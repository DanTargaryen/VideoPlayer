import { Body, Controller, Post } from '@nestjs/common';

import { ok } from '../../common/dto/api-response.dto';
import { AssistantService } from './assistant.service';
import { CreateAssistantChatDto } from './dto/create-assistant-chat.dto';

@Controller('assistant')
export class AssistantController {
  constructor(private readonly assistantService: AssistantService) {}

  @Post('chat')
  async chat(@Body() dto: CreateAssistantChatDto) {
    return ok(await this.assistantService.chat(dto));
  }
}
