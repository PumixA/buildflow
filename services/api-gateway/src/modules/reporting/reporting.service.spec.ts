import { QueryResult } from 'pg';
import { DatabaseService } from '../database/database.service';
import { ReportingService } from './reporting.service';

function resultat(rows: Array<Record<string, unknown>>): QueryResult<Record<string, unknown>> {
  return { rows, rowCount: rows.length, command: 'SELECT', oid: 0, fields: [] };
}

function construire(options: {
  ncr?: Record<string, unknown>;
  sync?: Record<string, unknown>;
  enabled?: boolean;
  echoue?: boolean;
}): ReportingService {
  const database = {
    get enabled() {
      return options.enabled ?? true;
    },
    query: (sql: string) => {
      if (options.echoue) {
        throw new Error('connexion perdue');
      }
      if (sql.includes('FROM ncr')) {
        return Promise.resolve(resultat([options.ncr ?? {}]));
      }
      return Promise.resolve(resultat([options.sync ?? {}]));
    }
  } as unknown as DatabaseService;

  return new ReportingService(database);
}

describe('ReportingService.kpi — mesures réelles (2.3)', () => {
  it('doit renvoyer les cibles ET les mesures, distinctement', async () => {
    const service = construire({
      ncr: { total: '25', ouvertes: '25', delai_jours: null },
      sync: { total: '7', reussies: '7' }
    });

    const { cibles, mesures } = await service.kpi();

    // Les cibles sont contractuelles ; les confondre avec des mesures était le
    // défaut : l'écran affichait « Uptime 99.95 % » sans rien mesurer.
    expect(cibles.uptime).toBe(99.9);
    expect(mesures.ncrTotal).toBe(25);
    expect(mesures.ncrOuvertes).toBe(25);
  });

  it('doit renvoyer null — et non zéro — quand aucune NCR n’est clôturée', async () => {
    const service = construire({
      ncr: { total: '25', ouvertes: '25', delai_jours: null },
      sync: { total: '7', reussies: '7' }
    });

    const { mesures } = await service.kpi();

    expect(mesures.delaiClotureJours).toBeNull();
  });

  it('doit calculer le délai moyen de clôture en jours', async () => {
    const service = construire({
      ncr: { total: '10', ouvertes: '6', delai_jours: '4.23' },
      sync: { total: '0', reussies: '0' }
    });

    const { mesures } = await service.kpi();

    expect(mesures.delaiClotureJours).toBe(4.2);
  });

  it('doit calculer le taux de synchronisation', async () => {
    const service = construire({
      ncr: { total: '0', ouvertes: '0', delai_jours: null },
      sync: { total: '8', reussies: '7' }
    });

    const { mesures } = await service.kpi();

    expect(mesures.tauxSynchronisation).toBe(87.5);
  });

  it('ne doit pas annoncer 100 % sur une file vide', async () => {
    // Une absence de synchronisation n'est pas une réussite intégrale.
    const service = construire({
      ncr: { total: '0', ouvertes: '0', delai_jours: null },
      sync: { total: '0', reussies: '0' }
    });

    const { mesures } = await service.kpi();

    expect(mesures.tauxSynchronisation).toBeNull();
  });

  it('doit laisser uptime et crash-free à null, faute de collecte', async () => {
    const service = construire({
      ncr: { total: '1', ouvertes: '1', delai_jours: null },
      sync: { total: '1', reussies: '1' }
    });

    const { mesures } = await service.kpi();

    expect(mesures.uptime).toBeNull();
    expect(mesures.crashFreeMobile).toBeNull();
  });

  it('doit renvoyer des mesures nulles si la base est absente', async () => {
    const service = construire({ enabled: false });

    const { cibles, mesures } = await service.kpi();

    expect(cibles.apiP95Ms).toBe(300);
    expect(mesures.ncrTotal).toBeNull();
  });

  it('doit renvoyer des mesures nulles plutôt que de casser si la base échoue', async () => {
    const service = construire({ echoue: true });

    const { mesures } = await service.kpi();

    expect(mesures.ncrTotal).toBeNull();
    expect(mesures.tauxSynchronisation).toBeNull();
  });
});
