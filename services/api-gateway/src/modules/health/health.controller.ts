import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/public.decorator';

// Sonde d'infrastructure : interrogee par le healthcheck Docker et par la CI,
// qui ne disposent d'aucun jeton.
@Public()
@Controller('health')
export class HealthController {
  @Get()
  health(): { status: string; service: string; timestamp: string } {
    return {
      status: 'UP',
      service: 'BuildFlow-API-Gateway',
      timestamp: new Date().toISOString()
    };
  }
}
