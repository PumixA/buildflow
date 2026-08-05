import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { MessagingModule } from '../messaging/messaging.module';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';

@Module({
  imports: [DatabaseModule, MessagingModule],
  providers: [AuditService],
  controllers: [AuditController],
  exports: [AuditService]
})
export class AuditModule {}
