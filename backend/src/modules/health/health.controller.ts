import { Controller, Get } from '@nestjs/common';

import { ok } from '../../common/dto/api-response.dto';

@Controller('health')
export class HealthController {
  @Get()
  getHealth() {
    return ok({
      status: 'ok',
      service: 'backend',
    });
  }
}
