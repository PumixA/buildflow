import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { MessagingModule } from '../messaging/messaging.module';
import { NcrModule } from '../ncr/ncr.module';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';

@Module({
  // `NcrModule` : une synchronisation doit produire une NCR, pas seulement
  // une ligne dans la file d'attente.
  imports: [MessagingModule, DatabaseModule, NcrModule],
  providers: [SyncService],
  controllers: [SyncController],
  exports: [SyncService]
})
export class SyncModule {}
