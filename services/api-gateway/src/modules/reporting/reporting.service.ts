import { Injectable } from '@nestjs/common';

@Injectable()
export class ReportingService {
  kpi(): {
    uptimeTarget: number;
    crashFreeTarget: number;
    syncSuccessTarget: number;
    apiP95TargetMs: number;
  } {
    return {
      uptimeTarget: 99.9,
      crashFreeTarget: 99.5,
      syncSuccessTarget: 99.3,
      apiP95TargetMs: 300
    };
  }
}
