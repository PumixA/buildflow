import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { CreateActionDto, CreateIncidentDto } from './dto/hse.dto';
import { HseService } from './hse.service';

type IncidentPath = {
  incidentId: string;
};

@Controller('hse')
export class HseController {
  constructor(private readonly hseService: HseService) {}

  @Get('dashboard')
  @Roles('RESPONSABLE_QSE', 'DIRECTION_TRAVAUX', 'ADMIN')
  dashboard(): ReturnType<HseService['dashboard']> {
    return this.hseService.dashboard();
  }

  @Get('incidents')
  @Roles('RESPONSABLE_QSE', 'DIRECTION_TRAVAUX', 'ADMIN')
  listIncidents(
    @Query('projectId') projectId?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    const all = this.hseService.listIncidents(projectId, status);
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

  @Get('incidents/:incidentId')
  @Roles('RESPONSABLE_QSE', 'DIRECTION_TRAVAUX', 'ADMIN')
  getIncident(@Param('incidentId') incidentId: string): ReturnType<HseService['getIncident']> {
    return this.hseService.getIncident(incidentId);
  }

  @Post('incidents')
  @Roles('CHEF_CHANTIER', 'RESPONSABLE_QSE', 'ADMIN')
  createIncident(@Body() payload: CreateIncidentDto): ReturnType<HseService['createIncident']> {
    return this.hseService.createIncident(payload);
  }

  @Post('actions')
  @Roles('RESPONSABLE_QSE', 'ADMIN')
  createAction(@Body() payload: CreateActionDto): ReturnType<HseService['createAction']> {
    return this.hseService.createAction(payload);
  }

  @Post('incidents/:incidentId/secure')
  @Roles('CHEF_CHANTIER', 'RESPONSABLE_QSE', 'ADMIN')
  secureSite(@Param() params: IncidentPath): ReturnType<HseService['confirmSiteSecured']> {
    return this.hseService.confirmSiteSecured(params.incidentId);
  }

  @Post('incidents/:incidentId/resolve')
  @Roles('RESPONSABLE_QSE', 'DIRECTION_TRAVAUX', 'ADMIN')
  resolve(@Param() params: IncidentPath): ReturnType<HseService['resolveIncident']> {
    return this.hseService.resolveIncident(params.incidentId);
  }
}
