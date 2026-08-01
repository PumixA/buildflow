import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Incident } from '../../../../../libs/domain/src/models';
import {
  CreateActionInput,
  CreateIncidentInput,
  HseService as DomainHseService
} from '../../../../../src/hse/hse.service';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';
import { MessagingService } from '../messaging/messaging.service';

/** Une action corrective HSE dont l'échéance est dépassée. */
export type OverdueAction = {
  id: string;
  incidentId: string;
  description: string;
  responsible: string;
  deadline: string;
  daysLate: number;
  status: string;
};

/**
 * Charge utile du tableau de bord HSE.
 *
 * Les trois compteurs ne portent volontairement pas sur la même entité, d'où les
 * commentaires : `incidents` et `ncr` sont deux tables distinctes, et l'interface
 * affiche `totalOpen` sous le libellé « NCR Ouvertes ».
 */
export type HseDashboard = {
  /** NCR non clôturées (table `ncr`). */
  totalOpen: number;
  /** NCR non clôturées de priorité CRITICAL (table `ncr`). */
  criticalOpen: number;
  /** Incidents HSE de gravité CRITICAL non résolus (table `incidents`). */
  immediateAlerts: number;
  latestIncidents: Incident[];
  overdueActions: OverdueAction[];
  overdueActionsCount: number;
};

/** Statuts considérés comme « l'action est retombée », donc jamais en retard. */
const CLOSED_ACTION_STATUSES = ['DONE', 'CLOSED', 'RESOLVED'];

/** Statuts considérés comme « la NCR est retombée », donc plus ouverte. */
const CLOSED_NCR_STATUSES = ['RESOLVED', 'CLOSED'];

@Injectable()
export class HseService {
  private readonly logger = new Logger(HseService.name);
  private readonly domainService = new DomainHseService();
  private readonly incidentToDbId = new Map<string, string>();
  private readonly projectToDbId = new Map<string, string>();
  private readonly userToDbId = new Map<string, string>();

  constructor(
    private readonly auditService: AuditService,
    private readonly databaseService: DatabaseService,
    private readonly messagingService: MessagingService
  ) {}

  private fireAndForget(op: Promise<unknown>, ctx: string): void {
    op.catch((err) => this.logger.error(`Opération secondaire HSE échouée: ${ctx}`, err));
  }

  createIncident(input: CreateIncidentInput): ReturnType<DomainHseService['createIncident']> {
    const incident = this.domainService.createIncident(input);
    this.fireAndForget(this.persistIncident(incident.id, input.projectId, input.creatorId, input.type, input.severity, input.description, incident.status), 'persistIncident');
    this.fireAndForget(this.messagingService.publish({
      topic: 'hse.incident.created',
      timestamp: new Date().toISOString(),
      payload: {
        id: incident.id,
        severity: incident.severity
      }
    }), 'publishIncident');
    this.auditService.append('hse.incident.created', input.creatorId, {
      incidentId: incident.id,
      severity: incident.severity
    });
    return incident;
  }

  createAction(input: CreateActionInput): ReturnType<DomainHseService['createAction']> {
    const action = this.domainService.createAction(input);
    this.fireAndForget(this.persistAction(input, action.id), "persistAction");
    this.fireAndForget(this.messagingService.publish({
      topic: 'hse.action.created',
      timestamp: new Date().toISOString(),
      payload: {
        id: action.id,
        incidentId: action.incidentId
      }
    }), 'publishAction');
    this.auditService.append('hse.action.created', input.responsibleId, {
      actionId: action.id,
      incidentId: action.incidentId
    });
    return action;
  }

  confirmSiteSecured(incidentId: string): ReturnType<DomainHseService['confirmSiteSecured']> {
    const updated = this.domainService.confirmSiteSecured(incidentId);
    this.fireAndForget(this.persistIncidentStatus(incidentId, updated.status), "persistIncidentStatus");
    this.auditService.append('hse.site.secured', 'SYSTEM', { incidentId });
    return updated;
  }

  resolveIncident(incidentId: string): ReturnType<DomainHseService['resolveIncident']> {
    const resolved = this.domainService.resolveIncident(incidentId);
    this.fireAndForget(this.persistIncidentStatus(incidentId, resolved.status), "persistIncidentStatus");
    this.auditService.append('hse.incident.resolved', 'SYSTEM', { incidentId });
    return resolved;
  }

  listIncidents(projectId?: string, status?: string): ReturnType<DomainHseService['listIncidents']> {
    return this.domainService.listIncidents(projectId, status);
  }

  getIncident(incidentId: string): ReturnType<DomainHseService['getIncidentById']> {
    return this.domainService.getIncidentById(incidentId);
  }

  /**
   * Tableau de bord HSE, la base faisant autorité.
   *
   * Auparavant cette méthode déléguait au service de domaine, qui compte les
   * incidents de sa `Map` mémoire. Conséquences : après tout redémarrage le
   * tableau affichait « NCR Ouvertes 0 » alors que la liste NCR en montrait 25,
   * et les incidents créés lors d'une session précédente disparaissaient.
   *
   * La mémoire reste le filet de secours si la base est absente ou en erreur —
   * mieux vaut des chiffres partiels qu'un tableau vide.
   */
  async dashboard(): Promise<HseDashboard> {
    if (!this.databaseService.enabled) {
      return this.dashboardDepuisMemoire();
    }

    try {
      const [ncrCounts, incidentCounts, latestIncidents, overdueActions] = await Promise.all([
        this.countOpenNcr(),
        this.countCriticalIncidents(),
        this.fetchLatestIncidents(),
        this.fetchOverdueActions()
      ]);

      return {
        totalOpen: ncrCounts.totalOpen,
        criticalOpen: ncrCounts.criticalOpen,
        immediateAlerts: incidentCounts,
        latestIncidents,
        overdueActions,
        overdueActionsCount: overdueActions.length
      };
    } catch (err) {
      this.logger.error(`Lecture du tableau de bord HSE échouée : ${(err as Error).message}`);
      return this.dashboardDepuisMemoire();
    }
  }

  private dashboardDepuisMemoire(): HseDashboard {
    const memoire = this.domainService.dashboard();
    return {
      ...memoire,
      // Les actions correctives ne vivent qu'en base : sans elle, aucune échéance
      // n'est connue. Renvoyer une liste vide plutôt que d'inventer un retard.
      overdueActions: [],
      overdueActionsCount: 0
    };
  }

  private async countOpenNcr(): Promise<{ totalOpen: number; criticalOpen: number }> {
    const result = await this.databaseService.query(
      `
      SELECT
        COUNT(*) FILTER (WHERE status <> ALL($1)) AS total_open,
        COUNT(*) FILTER (WHERE status <> ALL($1) AND priority = 'CRITICAL') AS critical_open
      FROM ncr
      `,
      [CLOSED_NCR_STATUSES]
    );
    const row = (result.rows[0] ?? {}) as { total_open?: string; critical_open?: string };
    return {
      totalOpen: Number(row.total_open ?? 0),
      criticalOpen: Number(row.critical_open ?? 0)
    };
  }

  private async countCriticalIncidents(): Promise<number> {
    const result = await this.databaseService.query(
      `SELECT COUNT(*) AS total FROM incidents WHERE severity = 'CRITICAL' AND status <> 'RESOLVED'`
    );
    const row = (result.rows[0] ?? {}) as { total?: string };
    return Number(row.total ?? 0);
  }

  private async fetchLatestIncidents(): Promise<Incident[]> {
    // `project_name` par jointure : `project_id` est un UUID technique, que
    // l'interface affichait tel quel à la place du code chantier.
    const result = await this.databaseService.query(
      `
      SELECT i.id, COALESCE(p.name, i.project_id::text) AS project_name, i.creator_id,
             i.type, i.severity, i.description, i.sync_status, i.status, i.created_at
      FROM incidents i
      LEFT JOIN projects p ON p.id = i.project_id
      ORDER BY i.created_at DESC
      LIMIT 5
      `
    );

    return (result.rows as Array<Record<string, unknown>>).map((row) => ({
      id: String(row.id),
      projectId: String(row.project_name ?? ''),
      creatorId: String(row.creator_id ?? ''),
      type: String(row.type ?? ''),
      severity: row.severity as Incident['severity'],
      description: String(row.description ?? ''),
      sync_status: Boolean(row.sync_status),
      status: row.status as Incident['status'],
      createdAt: new Date(String(row.created_at)).toISOString()
    }));
  }

  private async fetchOverdueActions(): Promise<OverdueAction[]> {
    const result = await this.databaseService.query(
      `
      SELECT a.id, a.incident_id, a.description, a.status, a.deadline,
             COALESCE(u.name, u.email, a.responsible_id::text) AS responsible,
             (CURRENT_DATE - a.deadline) AS days_late
      FROM hse_actions a
      LEFT JOIN users u ON u.id = a.responsible_id
      WHERE a.deadline IS NOT NULL
        AND a.deadline < CURRENT_DATE
        AND a.status <> ALL($1)
      ORDER BY a.deadline ASC
      LIMIT 20
      `,
      [CLOSED_ACTION_STATUSES]
    );

    return (result.rows as Array<Record<string, unknown>>).map((row) => ({
      id: String(row.id),
      incidentId: String(row.incident_id ?? ''),
      description: String(row.description ?? ''),
      responsible: String(row.responsible ?? ''),
      // `deadline` est de type `date` : on garde la journée seule, sans heure
      // fictive qui laisserait croire à une précision inexistante.
      deadline: new Date(String(row.deadline)).toISOString().slice(0, 10),
      daysLate: Number(row.days_late ?? 0),
      status: String(row.status ?? '')
    }));
  }

  private async persistIncident(
    domainId: string,
    projectCode: string,
    creatorCode: string,
    type: string,
    severity: string,
    description: string,
    status: string
  ): Promise<void> {
    if (!this.databaseService.enabled) {
      return;
    }

    const incidentDbId = this.incidentToDbId.get(domainId) ?? randomUUID();
    this.incidentToDbId.set(domainId, incidentDbId);

    const projectDbId = await this.ensureProject(projectCode);
    const creatorDbId = await this.ensureUser(creatorCode);

    await this.databaseService.query(
      `
      INSERT INTO incidents (id, project_id, creator_id, type, severity, description, sync_status, status, created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
      ON CONFLICT (id) DO UPDATE SET
        severity = EXCLUDED.severity,
        description = EXCLUDED.description,
        status = EXCLUDED.status
      `,
      [incidentDbId, projectDbId, creatorDbId, type, severity, description, false, status]
    );
  }

  private async persistIncidentStatus(domainId: string, status: string): Promise<void> {
    if (!this.databaseService.enabled) {
      return;
    }
    const incidentDbId = this.incidentToDbId.get(domainId);
    if (!incidentDbId) {
      return;
    }
    await this.databaseService.query('UPDATE incidents SET status = $1 WHERE id = $2', [status, incidentDbId]);
  }

  private async persistAction(input: CreateActionInput, actionId: string): Promise<void> {
    if (!this.databaseService.enabled) {
      return;
    }
    const incidentDbId = this.incidentToDbId.get(input.incidentId);
    if (!incidentDbId) {
      return;
    }

    const responsibleDbId = await this.ensureUser(input.responsibleId);
    await this.databaseService.query(
      `
      INSERT INTO hse_actions (id, incident_id, description, responsible_id, deadline, status)
      VALUES ($1,$2,$3,$4,$5,$6)
      ON CONFLICT (id) DO UPDATE SET
        description = EXCLUDED.description,
        deadline = EXCLUDED.deadline,
        status = EXCLUDED.status
      `,
      [randomUUID(), incidentDbId, input.description, responsibleDbId, input.deadline ?? null, 'OPEN']
    );

    this.auditService.append('hse.action.persisted', 'SYSTEM', {
      actionId
    });
  }

  private async ensureProject(projectCode: string): Promise<string> {
    const fromMemory = this.projectToDbId.get(projectCode);
    if (fromMemory) {
      return fromMemory;
    }

    const found = await this.databaseService.query(
      'SELECT id FROM projects WHERE name = $1 LIMIT 1',
      [projectCode]
    );
    if (found.rowCount && found.rows[0]) {
      const row = found.rows[0] as { id: string };
      this.projectToDbId.set(projectCode, row.id);
      return row.id;
    }

    const projectId = randomUUID();
    await this.databaseService.query(
      'INSERT INTO projects (id, name, location_gps, status, created_at) VALUES ($1,$2,$3,$4,NOW())',
      [projectId, projectCode, 'unknown', 'ACTIVE']
    );
    this.projectToDbId.set(projectCode, projectId);
    return projectId;
  }

  private async ensureUser(userCode: string): Promise<string> {
    const fromMemory = this.userToDbId.get(userCode);
    if (fromMemory) {
      return fromMemory;
    }

    const pseudoEmail = `${userCode.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'user'}@buildflow.local`;
    const found = await this.databaseService.query(
      'SELECT id FROM users WHERE email = $1 LIMIT 1',
      [pseudoEmail]
    );
    if (found.rowCount && found.rows[0]) {
      const row = found.rows[0] as { id: string };
      this.userToDbId.set(userCode, row.id);
      return row.id;
    }

    const userId = randomUUID();
    await this.databaseService.query(
      `
      INSERT INTO users (id, name, email, role, hashed_password, mfa_enabled, created_at)
      VALUES ($1,$2,$3,$4,$5,$6,NOW())
      `,
      [userId, userCode, pseudoEmail, 'RESPONSABLE_QSE', 'hash-placeholder', true]
    );
    this.userToDbId.set(userCode, userId);
    return userId;
  }
}
