import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { RolesGuard } from './auth/roles.guard';
import { AuditModule } from './audit/audit.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { HseModule } from './hse/hse.module';
import { MessagingModule } from './messaging/messaging.module';
import { NcrModule } from './ncr/ncr.module';
import { ReportingModule } from './reporting/reporting.module';
import { StorageModule } from './storage/storage.module';
import { SyncModule } from './sync/sync.module';

@Module({
  imports: [DatabaseModule, MessagingModule, HealthModule, NcrModule, HseModule, AuthModule, ReportingModule, SyncModule, StorageModule, AuditModule],
  providers: [
    {
      provide: APP_GUARD,
      useClass: RolesGuard
    }
  ]
})
export class AppModule {}
