import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { ReportingController } from './reporting.controller';
import { ReportingService } from './reporting.service';

@Module({
  // Les KPI sont calculés depuis la base, plus renvoyés en dur.
  imports: [DatabaseModule],
  providers: [ReportingService],
  controllers: [ReportingController],
  exports: [ReportingService]
})
export class ReportingModule {}
