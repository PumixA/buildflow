import { Controller, Get } from '@nestjs/common';

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
