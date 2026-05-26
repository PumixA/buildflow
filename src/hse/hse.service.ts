import { HseAction, Incident, IncidentSeverity } from '../../libs/domain/src/models';

export type CreateIncidentInput = {
  projectId: string;
  creatorId: string;
  type: string;
  severity: IncidentSeverity;
  description: string;
};

export type CreateActionInput = {
  incidentId: string;
  description: string;
  responsibleId: string;
  deadline?: string;
};

export class HseService {
  private readonly incidents = new Map<string, Incident>();
  private readonly actions = new Map<string, HseAction[]>();

  createIncident(input: CreateIncidentInput): Incident {
    this.assertIncidentPayload(input);
    const incident: Incident = {
      id: `inc-${this.incidents.size + 1}`,
      projectId: input.projectId,
      creatorId: input.creatorId,
      type: input.type,
      severity: input.severity,
      description: input.description,
      sync_status: false,
      status: 'OPEN',
      createdAt: new Date().toISOString()
    };

    this.incidents.set(incident.id, incident);
    return incident;
  }

  createAction(input: CreateActionInput): HseAction {
    const incident = this.incidents.get(input.incidentId);
    if (!incident) {
      throw new Error('Incident introuvable');
    }
    if (!input.description.trim()) {
      throw new Error('Description action obligatoire');
    }
    if (!input.responsibleId.trim()) {
      throw new Error('Responsable obligatoire');
    }

    const action: HseAction = {
      id: `action-${(this.actions.get(input.incidentId)?.length ?? 0) + 1}`,
      incidentId: input.incidentId,
      description: input.description,
      responsibleId: input.responsibleId,
      deadline: input.deadline,
      status: 'OPEN'
    };

    const list = this.actions.get(input.incidentId) ?? [];
    list.push(action);
    this.actions.set(input.incidentId, list);
    incident.status = 'IN_PROGRESS';
    return action;
  }

  confirmSiteSecured(incidentId: string): Incident {
    const incident = this.incidents.get(incidentId);
    if (!incident) {
      throw new Error('Incident introuvable');
    }
    incident.status = 'IN_PROGRESS';
    return incident;
  }

  resolveIncident(incidentId: string): Incident {
    const incident = this.incidents.get(incidentId);
    if (!incident) {
      throw new Error('Incident introuvable');
    }
    incident.status = 'RESOLVED';
    return incident;
  }

  dashboard(): {
    totalOpen: number;
    criticalOpen: number;
    immediateAlerts: number;
    latestIncidents: Incident[];
  } {
    const incidents = [...this.incidents.values()];
    const totalOpen = incidents.filter((incident) => incident.status !== 'RESOLVED').length;
    const criticalOpen = incidents.filter(
      (incident) => incident.status !== 'RESOLVED' && incident.severity === 'CRITICAL'
    ).length;
    const immediateAlerts = incidents.filter((incident) => incident.severity === 'CRITICAL').length;
    const latestIncidents = incidents.slice(-5).reverse();
    return {
      totalOpen,
      criticalOpen,
      immediateAlerts,
      latestIncidents
    };
  }

  private assertIncidentPayload(input: CreateIncidentInput): void {
    if (!input.projectId.trim()) {
      throw new Error('Projet obligatoire');
    }
    if (!input.creatorId.trim()) {
      throw new Error('Créateur obligatoire');
    }
    if (!input.type.trim()) {
      throw new Error('Type incident obligatoire');
    }
    if (!input.description.trim()) {
      throw new Error('Description incident obligatoire');
    }
    if (!['MINOR', 'MAJOR', 'CRITICAL'].includes(input.severity)) {
      throw new Error('Gravité invalide');
    }
  }
}
