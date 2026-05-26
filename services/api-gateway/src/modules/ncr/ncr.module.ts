import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { DatabaseModule } from '../database/database.module';
import { MessagingModule } from '../messaging/messaging.module';
import { StorageModule } from '../storage/storage.module';
import { NcrController } from './ncr.controller';
import { NcrService } from './ncr.service';

@Module({
  imports: [StorageModule, AuditModule, DatabaseModule, MessagingModule],
  providers: [NcrService],
  controllers: [NcrController],
  exports: [NcrService]
})
export class NcrModule {}
