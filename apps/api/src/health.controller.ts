import { Controller, Get } from '@nestjs/common';
import { Public } from './domains/auth/public.decorator.js';

@Controller('health')
export class HealthController {
  @Get()
  @Public()
  public getHealth(): { status: 'ok'; service: string } {
    return { status: 'ok', service: 'trustpay-api' };
  }
}
