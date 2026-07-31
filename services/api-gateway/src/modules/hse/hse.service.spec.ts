import { QueryResult } from 'pg';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';
import { MessagingService } from '../messaging/messaging.service';
import { HseService } from './hse.service';

/**
 * `pg` renvoie les agrégats sous forme de chaînes : les fixtures les reproduisent
 * telles quelles, sinon le test validerait une conversion qui n'a pas lieu en vrai.
 */
function resultat(rows: Array<Record<string, unknown>>): QueryResult<Record<string, unknown>> {
  return { rows, rowCount: rows.length, command: 'SELECT', oid: 0, fields: [] };
}

type Stub = {
  service: HseService;
  requetes: string[];
};

function construire(options: {
  enabled?: boolean;
  onQuery?: (sql: string) => QueryResult<Record<string, unknown>>;
}): Stub {
  const requetes: string[] = [];

  const database = {
    get enabled() {
      return options.enabled ?? true;
    },
    query: (sql: string) => {
      requetes.push(sql);
      if (!options.onQuery) {
        return Promise.resolve(resultat([]));
      }
      return Promise.resolve(options.onQuery(sql));
    }
  } as unknown as DatabaseService;

  const audit = { append: () => undefined } as unknown as AuditService;
  const messaging = { publish: () => Promise.resolve() } as unknown as MessagingService;

  return { service: new HseService(audit, database, messaging), requetes };
}

/** Aiguille chaque requête vers sa fixture, d'après un marqueur du SQL. */
function routeur(sql: string): QueryResult<Record<string, unknown>> {
  if (sql.includes('FROM ncr')) {
    return resultat([{ total_open: '25', critical_open: '4' }]);
  }
  if (sql.includes('hse_actions')) {
    return resultat([
      {
        id: 'act-1',
        incident_id: 'inc-1',
        description: 'Reprendre le ferraillage',
        status: 'OPEN',
        deadline: '2026-07-01',
        responsible: 'Alex Martin',
        days_late: 29
      }
    ]);
  }
  if (sql.includes('FROM incidents i')) {
    return resultat([
      {
        id: 'inc-1',
        project_name: 'PROJ-1',
        creator_id: 'usr-1',
        type: 'CHUTE',
        severity: 'CRITICAL',
        description: 'Garde-corps manquant',
        sync_status: true,
        status: 'OPEN',
        created_at: '2026-07-20T10:00:00.000Z'
      }
    ]);
  }
  return resultat([{ total: '1' }]);
}

describe('HseService.dashboard — la base fait autorité', () => {
  it('doit compter les NCR ouvertes en base et non les incidents en mémoire', async () => {
    const { service } = construire({ onQuery: routeur });

    const tableau = await service.dashboard();

    // Le service de domaine n'a aucun incident en mémoire : avant le correctif
    // ce compteur valait 0 alors que la liste NCR en affichait 25.
    expect(tableau.totalOpen).toBe(25);
    expect(tableau.criticalOpen).toBe(4);
  });

  it('doit remonter les actions correctives en retard', async () => {
    const { service } = construire({ onQuery: routeur });

    const tableau = await service.dashboard();

    expect(tableau.overdueActionsCount).toBe(1);
    expect(tableau.overdueActions[0]).toEqual({
      id: 'act-1',
      incidentId: 'inc-1',
      description: 'Reprendre le ferraillage',
      responsible: 'Alex Martin',
      deadline: '2026-07-01',
      daysLate: 29,
      status: 'OPEN'
    });
  });

  it('doit exclure en SQL les actions closes et celles sans échéance', async () => {
    const { service, requetes } = construire({ onQuery: routeur });

    await service.dashboard();

    const sqlActions = requetes.find((sql) => sql.includes('hse_actions'));
    expect(sqlActions).toBeDefined();
    // Le filtrage doit rester en base : le faire en mémoire imposerait de charger
    // toutes les actions pour n'en afficher que quelques-unes.
    expect(sqlActions).toContain('a.deadline IS NOT NULL');
    expect(sqlActions).toContain('a.deadline < CURRENT_DATE');
    expect(sqlActions).toContain('a.status <> ALL($1)');
  });

  it('doit résoudre le nom du chantier plutôt que son UUID', async () => {
    const { service } = construire({ onQuery: routeur });

    const tableau = await service.dashboard();

    expect(tableau.latestIncidents[0].projectId).toBe('PROJ-1');
  });

  it('doit retomber sur la mémoire quand la base est absente', async () => {
    const { service, requetes } = construire({ enabled: false });

    const tableau = await service.dashboard();

    expect(requetes).toHaveLength(0);
    expect(tableau.totalOpen).toBe(0);
    expect(tableau.overdueActions).toEqual([]);
  });

  it('doit retomber sur la mémoire plutôt que de casser si la base échoue', async () => {
    const { service } = construire({
      onQuery: () => {
        throw new Error('connexion perdue');
      }
    });

    const tableau = await service.dashboard();

    expect(tableau.totalOpen).toBe(0);
    expect(tableau.overdueActionsCount).toBe(0);
  });
});
