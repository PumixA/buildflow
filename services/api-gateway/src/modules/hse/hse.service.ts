import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  CreateActionInput,
  CreateIncidentInput,
  HseService as DomainHseService
} from '../../../../../src/hse/hse.service';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';
import { MessagingService } from '../messaging/messaging.service';

@Injectable()
export class HseService {
  private readonly domainService = new DomainHseService();
  private readonly incidentToDbId = new Map<string, string>();
  private readonly projectToDbId = new Map<string, string>();
  private readonly userToDbId = new Map<string, string>();

  constructor(
    private readonly auditService: AuditService,
    private readonly databaseService: DatabaseService,
    private readonly messagingService: MessagingService
  ) {}

  createIncident(input: CreateIncidentInput): ReturnType<DomainHseService['createIncident']> {
    const incident = this.domainService.createIncident(input);
    void this.persistIncident(incident.id, input.projectId, input.creatorId, input.type, input.severity, input.description, incident.status);
    void this.messagingService.publish({
      topic: 'hse.incident.created',
      timestamp: new Date().toISOString(),
      payload: {
        id: incident.id,
        severity: incident.severity
      }
    });
    this.auditService.append('hse.incident.created', input.creatorId, {
      incidentId: incident.id,
      severity: incident.severity
    });
    return incident;
  }

  createAction(input: CreateActionInput): ReturnType<DomainHseService['createAction']> {
    const action = this.domainService.createAction(input);
    void this.persistAction(input, action.id);
    void this.messagingService.publish({
      topic: 'hse.action.created',
      timestamp: new Date().toISOString(),
      payload: {
        id: action.id,
        incidentId: action.incidentId
      }
    });
    this.auditService.append('hse.action.created', input.responsibleId, {
      actionId: action.id,
      incidentId: action.incidentId
    });
    return action;
  }

  confirmSiteSecured(incidentId: string): ReturnType<DomainHseService['confirmSiteSecured']> {
    const updated = this.domainService.confirmSiteSecured(incidentId);
    void this.persistIncidentStatus(incidentId, updated.status);
    this.auditService.append('hse.site.secured', 'SYSTEM', { incidentId });
    return updated;
  }

  resolveIncident(incidentId: string): ReturnType<DomainHseService['resolveIncident']> {
    const resolved = this.domainService.resolveIncident(incidentId);
    void this.persistIncidentStatus(incidentId, resolved.status);
    this.auditService.append('hse.incident.resolved', 'SYSTEM', { incidentId });
    return resolved;
  }

  dashboard(): ReturnType<DomainHseService['dashboard']> {
    return this.domainService.dashboard();
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
