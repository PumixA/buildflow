import { ConflictException, NotFoundException } from '@nestjs/common';
import { QueryResult } from 'pg';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';
import { ProjectsService } from './projects.service';

type QueryStub = (sql: string, values?: unknown[]) => Promise<Partial<QueryResult<Record<string, unknown>>>>;

function buildService(options: { enabled?: boolean; query?: QueryStub } = {}) {
  const appended: Array<{ action: string; actorId: string }> = [];
  const database = {
    enabled: options.enabled ?? true,
    query: options.query ?? (() => Promise.resolve({ rows: [], rowCount: 0 }))
  } as unknown as DatabaseService;
  const audit = {
    append: (action: string, actorId: string) => {
      appended.push({ action, actorId });
    }
  } as unknown as AuditService;

  return { service: new ProjectsService(database, audit), appended };
}

const ROW = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Paris - La Défense T4',
  location_gps: '48.8566, 2.3522',
  status: 'ACTIVE',
  created_at: '2026-07-01T08:00:00.000Z',
  // pg sérialise les COUNT (bigint) en chaînes : le service doit les convertir.
  open_ncr_count: '3',
  total_ncr_count: '7'
};

describe('ProjectsService', () => {
  it('renvoie une liste vide plutôt que de planter quand aucune base n\'est configurée', async () => {
    const { service } = buildService({ enabled: false });
    await expect(service.list()).resolves.toEqual([]);
  });

  it('convertit les compteurs bigint renvoyés en chaîne par pg', async () => {
    const { service } = buildService({ query: () => Promise.resolve({ rows: [ROW], rowCount: 1 }) });

    const [project] = await service.list();

    expect(project.openNcrCount).toBe(3);
    expect(project.totalNcrCount).toBe(7);
    expect(project.name).toBe('Paris - La Défense T4');
    expect(project.locationGps).toBe('48.8566, 2.3522');
  });

  it('résout un chantier par son nom comme par son UUID', async () => {
    const recu: unknown[][] = [];
    const { service } = buildService({
      query: (_sql, values = []) => {
        recu.push(values);
        return Promise.resolve({ rows: [ROW], rowCount: 1 });
      }
    });

    await service.detail('Paris - La Défense T4');

    expect(recu[0]).toEqual(['Paris - La Défense T4']);
  });

  it('signale un chantier inexistant en 404 et non en 500', async () => {
    const { service } = buildService({ query: () => Promise.resolve({ rows: [], rowCount: 0 }) });
    await expect(service.detail('inconnu')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('refuse un doublon de nom en 409 avant de heurter idx_projects_name', async () => {
    const { service } = buildService({
      query: (sql) =>
        sql.includes('SELECT 1 FROM projects')
          ? Promise.resolve({ rows: [{ '?column?': 1 }], rowCount: 1 })
          : Promise.reject(new Error("l'INSERT ne doit pas être tenté"))
    });

    await expect(
      service.create({ name: 'Paris - La Défense T4', actorId: 'admin@buildflow.io' }, 'admin@buildflow.io')
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("trace l'ouverture d'un chantier au journal d'audit", async () => {
    const { service, appended } = buildService({
      query: (sql) => {
        if (sql.includes('SELECT 1 FROM projects')) return Promise.resolve({ rows: [], rowCount: 0 });
        if (sql.includes('INSERT INTO projects')) return Promise.resolve({ rows: [], rowCount: 1 });
        return Promise.resolve({ rows: [ROW], rowCount: 1 });
      }
    });

    await service.create({ name: 'Lyon - Part-Dieu', actorId: 'admin@buildflow.io' }, 'admin@buildflow.io');

    expect(appended).toEqual([{ action: 'project.created', actorId: 'admin@buildflow.io' }]);
  });
});
