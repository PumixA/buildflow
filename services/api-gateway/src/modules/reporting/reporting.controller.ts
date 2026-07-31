import { Controller, Get } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { ReportingService } from './reporting.service';

@Controller('reporting')
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  // Repondait 200 sans le moindre en-tete : les indicateurs de pilotage
  // etaient lisibles par n'importe qui (audit, H3).
  @Get('kpi')
  @Roles('RESPONSABLE_QSE', 'DIRECTION_TRAVAUX', 'ADMIN')
  kpi(): ReturnType<ReportingService['kpi']> {
    return this.reportingService.kpi();
  }
}
