import { Body, Controller, Param, Post, Get } from '@nestjs/common';
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
