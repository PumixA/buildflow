import { Module } from '@nestjs/common';
import { MessagingModule } from '../messaging/messaging.module';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';

@Module({
  imports: [MessagingModule],
  providers: [SyncService],
  controllers: [SyncController],
  exports: [SyncService]
})
export class SyncModule {}
