import { HseService } from './hse.service';

describe('HSEService', () => {
  let service: HseService;

  beforeEach(() => {
    service = new HseService();
  });

  it('doit créer un incident critique et le refléter dans le dashboard', () => {
    service.createIncident({
      projectId: 'PROJ-200',
      creatorId: 'USR-QSE',
      type: 'RISK',
      severity: 'CRITICAL',
      description: 'Risque de chute hauteur'
    });

    const dashboard = service.dashboard();
    expect(dashboard.totalOpen).toBe(1);
    expect(dashboard.criticalOpen).toBe(1);
    expect(dashboard.immediateAlerts).toBe(1);
  });

  it('doit rejeter une description vide', () => {
    expect(() =>
      service.createIncident({
        projectId: 'PROJ-200',
        creatorId: 'USR-QSE',
        type: 'RISK',
        severity: 'MAJOR',
        description: ''
      })
    ).toThrow('Description incident obligatoire');
  });

  it('doit créer une action puis sécuriser et résoudre l incident', () => {
    const incident = service.createIncident({
      projectId: 'PROJ-201',
      creatorId: 'USR-QSE',
      type: 'INCIDENT',
      severity: 'MAJOR',
      description: 'Chute d objet'
    });

    const action = service.createAction({
      incidentId: incident.id,
      description: 'Balisage immédiat',
      responsibleId: 'USR-CHEF',
      deadline: '2026-04-10'
    });
    expect(action.incidentId).toBe(incident.id);

    const secured = service.confirmSiteSecured(incident.id);
    expect(secured.status).toBe('IN_PROGRESS');

    const resolved = service.resolveIncident(incident.id);
    expect(resolved.status).toBe('RESOLVED');
  });

  it('doit gérer les erreurs incident/action inexistants', () => {
    expect(() =>
      service.createAction({
        incidentId: 'inc-404',
        description: 'Action',
        responsibleId: 'USR-CHEF'
      })
    ).toThrow('Incident introuvable');

    expect(() => service.confirmSiteSecured('inc-404')).toThrow('Incident introuvable');
    expect(() => service.resolveIncident('inc-404')).toThrow('Incident introuvable');
  });

  it('doit valider les champs requis du signalement', () => {
    expect(() =>
      service.createIncident({
        projectId: '',
        creatorId: 'USR-QSE',
        type: 'INCIDENT',
        severity: 'MINOR',
        description: 'x'
      })
    ).toThrow('Projet obligatoire');

    expect(() =>
      service.createIncident({
        projectId: 'PROJ-1',
        creatorId: '',
        type: 'INCIDENT',
        severity: 'MINOR',
        description: 'x'
      })
    ).toThrow('Créateur obligatoire');

    expect(() =>
      service.createIncident({
        projectId: 'PROJ-1',
        creatorId: 'USR-1',
        type: '',
        severity: 'MINOR',
        description: 'x'
      })
    ).toThrow('Type incident obligatoire');
  });

  it('doit lister les incidents et filtrer par projet', () => {
    service.createIncident({
      projectId: 'PROJ-1', creatorId: 'USR-CHEF', type: 'INCIDENT',
      severity: 'MAJOR', description: 'Incident A'
    });
    service.createIncident({
      projectId: 'PROJ-2', creatorId: 'USR-CHEF', type: 'NEAR_MISS',
      severity: 'MINOR', description: 'Incident B'
    });

    const all = service.listIncidents();
    expect(all.length).toBe(2);

    const filtered = service.listIncidents('PROJ-1');
    expect(filtered.length).toBe(1);
    expect(filtered[0].description).toBe('Incident A');

    const detail = service.getIncidentById(filtered[0].id);
    expect(detail.description).toBe('Incident A');
  });

  it('doit lever une erreur pour un incident inexistant', () => {
    expect(() => service.getIncidentById('INC-404')).toThrow('introuvable');
  });
});
