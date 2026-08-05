import { Controller, Get, Query } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { AuditService } from './audit.service';

@Controller('audit')
@Roles('RESPONSABLE_QSE', 'DIRECTION_TRAVAUX', 'ADMIN')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('logs')
  logs(@Query('page') page?: string, @Query('limit') limit?: string) {
    const all = this.auditService.list();
    const p = Math.max(1, parseInt(page || '1', 10) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit || '20', 10) || 20));
    const start = (p - 1) * l;
    return {
      items: all.slice(start, start + l),
      total: all.length,
      page: p,
      limit: l,
      totalPages: Math.ceil(all.length / l)
    };
  }

  @Get('verify')
  verify() {
    return this.auditService.verifyChain();
  }
}
