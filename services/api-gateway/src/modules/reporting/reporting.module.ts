import { Module } from '@nestjs/common';
import { ReportingController } from './reporting.controller';
import { ReportingService } from './reporting.service';

@Module({
  providers: [ReportingService],
  controllers: [ReportingController],
  exports: [ReportingService]
})
export class ReportingModule {}
