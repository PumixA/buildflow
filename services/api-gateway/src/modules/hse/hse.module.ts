import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { DatabaseModule } from '../database/database.module';
import { MessagingModule } from '../messaging/messaging.module';
import { HseController } from './hse.controller';
import { HseService } from './hse.service';

@Module({
  imports: [AuditModule, DatabaseModule, MessagingModule],
  providers: [HseService],
  controllers: [HseController],
  exports: [HseService]
})
export class HseModule {}
