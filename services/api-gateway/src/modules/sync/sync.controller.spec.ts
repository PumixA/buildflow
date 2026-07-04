import { Test, TestingModule } from '@nestjs/testing';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';

describe('SyncController', () => {
  let controller: SyncController;

  beforeEach(async () => {
    const mockService = {
      status: () => ({ mode: 'offline-first', pending: 0, synced: 1, conflicts: 0 }),
      queue: () => [{ localId: 'test-1', version: 1, payload: {}, status: 'SYNCED', contentHash: 'abc', updatedAt: new Date().toISOString(), message: 'OK' }],
      push: (input: { localId: string; version: number; payload: Record<string, unknown> }) => ({
        sync_status: true, httpCode: 201 as const,
        item: { localId: input.localId, version: input.version, payload: input.payload, status: 'SYNCED' as const, contentHash: 'abc', updatedAt: new Date().toISOString(), message: 'OK' },
        notification: 'OK', contentHash: 'abc'
      }),
      resolve: (input: { localId: string; version: number; payload: Record<string, unknown>; strategy: 'LWW' }) => ({
        sync_status: true, httpCode: 200 as const,
        item: { localId: input.localId, version: input.version, payload: input.payload, status: 'SYNCED' as const, contentHash: 'abc', updatedAt: new Date().toISOString(), message: 'OK' },
        strategy: 'LWW' as const, contentHash: 'abc'
      })
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SyncController],
      providers: [{ provide: SyncService, useValue: mockService }]
    }).compile();

    controller = module.get<SyncController>(SyncController);
  });

  it('should return sync status', async () => {
    const result = await controller.status();
    expect(result.mode).toBe('offline-first');
    expect(result.synced).toBe(1);
  });

  it('should return sync queue with pagination', async () => {
    const result = await controller.queue('1', '20');
    expect(result.items.length).toBeGreaterThanOrEqual(0);
    expect(result.page).toBe(1);
  });

  it('should push a sync record', async () => {
    const result = await controller.push({ localId: 'test-2', version: 1, payload: { title: 'Test' } });
    expect(result.httpCode).toBe(201);
    expect(result.sync_status).toBe(true);
  });

  it('should resolve a conflict', async () => {
    const result = await controller.resolve({ localId: 'test-3', version: 2, payload: { title: 'Test' }, strategy: 'LWW' });
    expect(result.httpCode).toBe(200);
    expect(result.strategy).toBe('LWW');
  });
});
