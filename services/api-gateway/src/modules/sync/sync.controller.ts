import { Body, Controller, Get, Post } from '@nestjs/common';
import { PushSyncDto, ResolveSyncDto } from './dto/sync.dto';
import { SyncService } from './sync.service';

@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Get('status')
  status(): ReturnType<SyncService['status']> {
    return this.syncService.status();
  }

  @Get('queue')
  queue(): ReturnType<SyncService['queue']> {
    return this.syncService.queue();
  }

  @Post('push')
  push(@Body() payload: PushSyncDto): ReturnType<SyncService['push']> {
    return this.syncService.push(payload);
  }

  @Post('resolve')
  resolve(@Body() payload: ResolveSyncDto): ReturnType<SyncService['resolve']> {
    return this.syncService.resolve(payload);
  }
}
