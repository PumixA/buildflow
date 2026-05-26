import { Controller, Get } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { AuditService } from './audit.service';

@Controller('audit')
@Roles('RESPONSABLE_QSE', 'DIRECTION_TRAVAUX', 'ADMIN')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('logs')
  logs() {
    return this.auditService.list();
  }
}
