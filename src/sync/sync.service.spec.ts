import { SyncService } from './sync.service';

describe('SyncService', () => {
  let service: SyncService;

  beforeEach(() => {
    service = new SyncService();
  });

  it('doit synchroniser une donnée inédite en 201', () => {
    const result = service.push({
      localId: 'local-1',
      version: 1,
      payload: { title: 'NCR A' }
    });
    expect(result.httpCode).toBe(201);
    expect(result.sync_status).toBe(true);
    expect(result.item.status).toBe('SYNCED');
  });

  it('doit remonter un conflit 409 sur version obsolète', () => {
    service.push({
      localId: 'local-1',
      version: 2,
      payload: { title: 'NCR A v2' }
    });
    const result = service.push({
      localId: 'local-1',
      version: 1,
      payload: { title: 'NCR A v1' }
    });
    expect(result.httpCode).toBe(409);
    expect(result.item.status).toBe('CONFLICT');
  });

  it('doit résoudre un conflit en LWW', () => {
    service.push({
      localId: 'local-2',
      version: 3,
      payload: { title: 'NCR B v3' }
    });
    service.push({
      localId: 'local-2',
      version: 2,
      payload: { title: 'NCR B v2' }
    });

    const resolved = service.resolveConflict({
      localId: 'local-2',
      version: 4,
      payload: { title: 'NCR B v4 resolved' },
      strategy: 'LWW'
    });

    expect(resolved.sync_status).toBe(true);
    expect(resolved.item.status).toBe('SYNCED');
    expect(resolved.strategy).toBe('LWW');
  });

  it('doit exposer les statuts de queue et permettre une résolution manuelle', () => {
    service.push({
      localId: 'local-3',
      version: 5,
      payload: { title: 'NCR C v5' }
    });
    service.push({
      localId: 'local-3',
      version: 4,
      payload: { title: 'NCR C v4' }
    });

    const before = service.status();
    expect(before.conflicts).toBe(1);

    const resolved = service.resolveConflict({
      localId: 'local-3',
      version: 6,
      payload: { title: 'NCR C v6 manual' },
      strategy: 'MANUAL'
    });

    expect(resolved.strategy).toBe('MANUAL');
    const after = service.status();
    expect(after.conflicts).toBe(0);
    expect(after.synced).toBeGreaterThanOrEqual(1);
    expect(service.listQueue().length).toBeGreaterThanOrEqual(1);
  });
});
