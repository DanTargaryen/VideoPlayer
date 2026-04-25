import { Controller, Get, Post, Body } from '@nestjs/common';
import { CaptchaService } from './captcha.service';
import { ok } from '../../common/dto/api-response.dto';

class VerifyCaptchaDto {
  id!: string;
  code!: string;
}

@Controller('captcha')
export class CaptchaController {
  constructor(private readonly captchaService: CaptchaService) {}

  @Get()
  generateCaptcha() {
    const result = this.captchaService.generateCaptcha();
    return ok(result);
  }

  @Post('verify')
  verifyCaptcha(@Body() dto: VerifyCaptchaDto) {
    const isValid = this.captchaService.verifyCaptcha(dto.id, dto.code);
    return ok({ valid: isValid });
  }
}