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
import { UpdateNcrDto } from './dto/update-ncr.dto';
import { NcrService } from './ncr.service';

@Controller('ncr')
export class NcrController {
  constructor(private readonly ncrService: NcrService) {}

  @Get()
  @Roles('RESPONSABLE_QSE', 'DIRECTION_TRAVAUX', 'ADMIN')
  async list(
    @Query('projectId') projectId?: string,
    @Query('status') status?: NcrStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    const all = await this.ncrService.list(projectId, status);
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

  @Patch(':ncrId')
  @Roles('RESPONSABLE_QSE', 'DIRECTION_TRAVAUX', 'ADMIN')
  update(@Param('ncrId') ncrId: string, @Body() dto: UpdateNcrDto): ReturnType<NcrService['update']> {
    return this.ncrService.update(ncrId, dto);
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
