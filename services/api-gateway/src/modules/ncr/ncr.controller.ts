import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { NcrStatus } from '../../../../../libs/domain/src/models';
import { ManagedNcr } from '../../../../../src/ncr/ncr.service';
import { Roles } from '../auth/roles.decorator';
import {
  AddClosureProofDto,
  AssignNcrTaskDto,
  CloseNcrDto,
  CreateNcrDto,
  SetNcrStatusDto
} from './dto/ncr.dto';
import { NcrService } from './ncr.service';

@Controller('ncr')
export class NcrController {
  constructor(private readonly ncrService: NcrService) {}

  @Get()
  @Roles('RESPONSABLE_QSE', 'DIRECTION_TRAVAUX', 'ADMIN')
  list(@Query('projectId') projectId?: string, @Query('status') status?: NcrStatus): ReturnType<NcrService['list']> {
    return this.ncrService.list(projectId, status);
  }

  @Get(':ncrId')
  @Roles('RESPONSABLE_QSE', 'DIRECTION_TRAVAUX', 'ADMIN')
  detail(@Param('ncrId') ncrId: string): ReturnType<NcrService['detail']> {
    return this.ncrService.detail(ncrId);
  }

  @Post()
  @Roles('CHEF_CHANTIER', 'RESPONSABLE_QSE', 'ADMIN')
  create(@Body() payload: CreateNcrDto): ReturnType<NcrService['create']> {
    return this.ncrService.create(payload);
  }

  @Patch(':ncrId/status')
  @Roles('RESPONSABLE_QSE', 'DIRECTION_TRAVAUX', 'ADMIN')
  setStatus(@Param('ncrId') ncrId: string, @Body() payload: SetNcrStatusDto): ReturnType<NcrService['setStatus']> {
    return this.ncrService.setStatus(ncrId, payload.status, payload.actorId, payload.comment);
  }

  @Post(':ncrId/tasks')
  @Roles('RESPONSABLE_QSE', 'ADMIN')
  assignTask(@Param('ncrId') ncrId: string, @Body() payload: AssignNcrTaskDto): ReturnType<NcrService['assignTask']> {
    return this.ncrService.assignTask(ncrId, payload.description, payload.assigneeId);
  }

  @Post(':ncrId/closure-proof')
  @Roles('CHEF_CHANTIER', 'RESPONSABLE_QSE', 'ADMIN')
  async addClosureProof(
    @Param('ncrId') ncrId: string,
    @Body() payload: AddClosureProofDto
  ): Promise<ManagedNcr> {
    return this.ncrService.addClosureProof(
      ncrId,
      payload.actorId,
      payload.fileName,
      payload.contentType,
      payload.payloadBase64
    );
  }

  @Post(':ncrId/close')
  @Roles('RESPONSABLE_QSE', 'DIRECTION_TRAVAUX', 'ADMIN')
  close(@Param('ncrId') ncrId: string, @Body() payload: CloseNcrDto): ReturnType<NcrService['close']> {
    return this.ncrService.close(ncrId, payload.validatorId);
  }
}
