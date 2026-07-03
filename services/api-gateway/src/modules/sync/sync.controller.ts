import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { PushSyncDto, ResolveSyncDto } from './dto/sync.dto';
import { SyncService } from './sync.service';

@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Get('status')
  @Roles('RESPONSABLE_QSE', 'DIRECTION_TRAVAUX', 'ADMIN')
  status(): ReturnType<SyncService['status']> {
    return this.syncService.status();
  }

  @Get('queue')
  @Roles('RESPONSABLE_QSE', 'DIRECTION_TRAVAUX', 'ADMIN')
  queue(): ReturnType<SyncService['queue']> {
    return this.syncService.queue();
  }

  @Post('push')
  @Roles('CHEF_CHANTIER', 'RESPONSABLE_QSE', 'ADMIN')
  push(@Body() payload: PushSyncDto): ReturnType<SyncService['push']> {
    return this.syncService.push(payload);
  }

  @Post('resolve')
  @Roles('RESPONSABLE_QSE', 'ADMIN')
  resolve(@Body() payload: ResolveSyncDto): ReturnType<SyncService['resolve']> {
    return this.syncService.resolve(payload);
  }
}
