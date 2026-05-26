import { Injectable } from '@nestjs/common';
import { SyncService as DomainSyncService } from '../../../../../src/sync/sync.service';
import { MessagingService } from '../messaging/messaging.service';

type SyncRecord = {
  localId: string;
  version: number;
  payload: Record<string, unknown>;
};

type ResolveRecord = {
  localId: string;
  version: number;
  payload: Record<string, unknown>;
  strategy: 'LWW' | 'MANUAL';
};

@Injectable()
export class SyncService {
  private readonly domain = new DomainSyncService();

  constructor(private readonly messagingService: MessagingService) {}

  status(): ReturnType<DomainSyncService['status']> {
    return this.domain.status();
  }

  queue(): ReturnType<DomainSyncService['listQueue']> {
    return this.domain.listQueue();
  }

  push(input: SyncRecord): ReturnType<DomainSyncService['push']> {
    const result = this.domain.push(input);
    void this.messagingService.publish({
      topic: result.httpCode === 409 ? 'sync.conflict' : 'sync.completed',
      timestamp: new Date().toISOString(),
      payload: {
        localId: input.localId,
        httpCode: result.httpCode
      }
    });
    return result;
  }

  resolve(input: ResolveRecord): ReturnType<DomainSyncService['resolveConflict']> {
    const result = this.domain.resolveConflict(input);
    void this.messagingService.publish({
      topic: 'sync.completed',
      timestamp: new Date().toISOString(),
      payload: {
        localId: input.localId,
        strategy: input.strategy
      }
    });
    return result;
  }
}
