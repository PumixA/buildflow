import { Body, Controller, Get, Post, Query } from '@nestjs/common';
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
  async queue(@Query('page') page?: string, @Query('limit') limit?: string) {
    const all = await this.syncService.queue();
    const p = Math.max(1, parseInt(page || '1', 10) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit || '20', 10) || 20));
    const start = (p - 1) * l;
    const items = Array.isArray(all) ? all : [];
    return {
      items: items.slice(start, start + l),
      total: items.length,
      page: p,
      limit: l,
      totalPages: Math.ceil(items.length / l)
    };
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
