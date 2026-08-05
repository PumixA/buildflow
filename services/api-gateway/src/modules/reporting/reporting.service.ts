import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

/**
 * Cibles contractuelles, issues de la note de cadrage.
 *
 * Ce sont des objectifs, pas des observations. Les afficher comme des mesures
 * est précisément le défaut corrigé ici : l'interface montrait « Uptime 99.95 % »
 * alors que rien n'était mesuré.
 */
const CIBLES = {
  uptime: 99.9,
  crashFree: 99.5,
  syncSuccess: 99.3,
  apiP95Ms: 300
} as const;

/**
 * Mesures réellement calculées depuis la base.
 *
 * `null` signifie « non mesurable en l'état », jamais « zéro ». La distinction
 * compte : l'interface affiche un tiret là où il n'y a pas de donnée, plutôt
 * que d'inventer un chiffre.
 */
export type KpiMesures = {
  /** NCR non clôturées. */
  ncrOuvertes: number | null;
  ncrTotal: number | null;
  /** Délai moyen entre création et clôture, en jours. */
  delaiClotureJours: number | null;
  /** Part des éléments de la file effectivement synchronisés, en %. */
  tauxSynchronisation: number | null;
  syncTotal: number | null;
  /**
   * Volontairement non mesurés : ils supposent une collecte d'exploitation
   * — sonde de disponibilité, rapports de plantage mobile — qui n'existe pas.
   * OpenTelemetry est branché mais n'alimente aucun stockage interrogeable.
   */
  uptime: null;
  crashFreeMobile: null;
};

@Injectable()
export class ReportingService {
  private readonly logger = new Logger(ReportingService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  async kpi(): Promise<{ cibles: typeof CIBLES; mesures: KpiMesures }> {
    return { cibles: CIBLES, mesures: await this.mesurer() };
  }

  private async mesurer(): Promise<KpiMesures> {
    const vide: KpiMesures = {
      ncrOuvertes: null,
      ncrTotal: null,
      delaiClotureJours: null,
      tauxSynchronisation: null,
      syncTotal: null,
      uptime: null,
      crashFreeMobile: null
    };

    if (!this.databaseService.enabled) {
      return vide;
    }

    try {
      const [ncr, sync] = await Promise.all([
        this.databaseService.query(`
          SELECT
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE status NOT IN ('RESOLVED','CLOSED')) AS ouvertes,
            AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400)
              FILTER (WHERE status IN ('RESOLVED','CLOSED')) AS delai_jours
          FROM ncr
        `),
        this.databaseService.query(`
          SELECT
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE status = 'SYNCED') AS reussies
          FROM sync_queue
        `)
      ]);

      const l = (ncr.rows[0] ?? {}) as Record<string, string | null>;
      const s = (sync.rows[0] ?? {}) as Record<string, string | null>;
      const syncTotal = Number(s.total ?? 0);
      const delai = l.delai_jours;

      return {
        ncrTotal: Number(l.total ?? 0),
        ncrOuvertes: Number(l.ouvertes ?? 0),
        // `AVG` assorti d'un FILTER sans ligne correspondante renvoie NULL, pas 0 :
        // aucune NCR close signifie « délai non mesurable », pas « zéro jour ».
        delaiClotureJours:
          delai === null || delai === undefined ? null : Math.round(Number(delai) * 10) / 10,
        // Une file vide ne vaut pas 100 % de réussite : c'est une absence de mesure.
        tauxSynchronisation:
          syncTotal === 0 ? null : Math.round((Number(s.reussies ?? 0) / syncTotal) * 1000) / 10,
        syncTotal,
        uptime: null,
        crashFreeMobile: null
      };
    } catch (err) {
      this.logger.error(`Calcul des KPI échoué : ${(err as Error).message}`);
      return vide;
    }
  }
}
