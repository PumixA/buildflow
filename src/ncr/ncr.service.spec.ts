import edgeCases from '../../test/fixtures/ncr_edge_cases.json';
import { NcrService } from './ncr.service';

describe('NCRService - Validation Qualité & TDD', () => {
  let service: NcrService;

  beforeEach(() => {
    service = new NcrService();
  });

  it('doit rejeter une NCR si aucune photo n est jointe', () => {
    expect(() =>
      service.createNCR({
        title: 'Fissure dalle',
        description: 'Aucune photo',
        projectId: 'PROJ-001',
        creatorId: 'USR-001',
        photos: [],
        latitude: 48.8924,
        longitude: 2.236,
        priority: 'MEDIUM'
      })
    ).toThrow('Photo obligatoire');
  });

  it('doit marquer la NCR comme "non synchronisée" par défaut (Offline-first)', () => {
    const result = service.createNCR({
      title: 'Défaut étanchéité',
      description: 'Test sync',
      projectId: 'PROJ-001',
      creatorId: 'USR-001',
      photos: ['url_photo_1'],
      latitude: 48.8924,
      longitude: 2.236,
      priority: 'HIGH'
    });
    expect(result.sync_status).toBe(false);
  });

  it('doit rejeter une NCR si le projectId est manquant', () => {
    const payload = edgeCases.find((entry) => entry.case === 'missing_project_id')?.payload;
    expect(payload).toBeDefined();
    expect(() =>
      service.createNCR({
        ...(payload as {
          title: string;
          description: string;
          projectId: string;
          creatorId: string;
          photos: string[];
          latitude: number;
          longitude: number;
        }),
        priority: 'MEDIUM'
      })
    ).toThrow('Projet obligatoire');
  });

  it('doit rejeter une NCR si les coordonnées GPS sont manquantes', () => {
    const payload = edgeCases.find((entry) => entry.case === 'missing_gps')?.payload;
    expect(payload).toBeDefined();
    expect(() =>
      service.createNCR({
        title: (payload as { title: string }).title,
        description: (payload as { description: string }).description,
        projectId: (payload as { projectId: string }).projectId,
        creatorId: (payload as { creatorId: string }).creatorId,
        photos: (payload as { photos: string[] }).photos,
        priority: 'MEDIUM'
      })
    ).toThrow('Coordonnées GPS obligatoires');
  });

  it('doit couvrir le cycle complet NCR: analyse, tâche, preuve, clôture', () => {
    const created = service.createNCR({
      title: 'Défaut ferraillage',
      description: 'Armatures incomplètes',
      projectId: 'PROJ-777',
      creatorId: 'USR-777',
      photos: ['img://1'],
      latitude: 45.764,
      longitude: 4.836,
      priority: 'HIGH'
    });

    const listed = service.list('PROJ-777');
    expect(listed).toHaveLength(1);
    expect(service.getById(created.id).status).toBe('OPEN');

    service.setStatus(created.id, 'IN_ANALYSIS', 'USR-QSE', 'Analyse QSE');
    service.assignCorrectiveTask(created.id, 'Reprendre coulage', 'USR-CHEF');
    service.setStatus(created.id, 'RESOLVED', 'USR-QSE', 'Résolution validée');
    service.addClosureProof(created.id, 's3://proof', 'USR-CHEF');
    const closed = service.closeNCR(created.id, 'USR-QSE');

    expect(closed.status).toBe('CLOSED');
    expect(closed.correctiveTasks).toHaveLength(1);
    expect(closed.closureProofs).toHaveLength(1);
    expect(service.list(undefined, 'CLOSED')).toHaveLength(1);
  });

  it('doit rejeter latitude et longitude invalides', () => {
    expect(() =>
      service.createNCR({
        title: 'GPS invalide',
        description: 'Latitude hors bornes',
        projectId: 'PROJ-999',
        creatorId: 'USR-999',
        photos: ['img://proof'],
        latitude: 99,
        longitude: 4.8,
        priority: 'LOW'
      })
    ).toThrow('Latitude invalide');

    expect(() =>
      service.createNCR({
        title: 'GPS invalide',
        description: 'Longitude hors bornes',
        projectId: 'PROJ-999',
        creatorId: 'USR-999',
        photos: ['img://proof'],
        latitude: 48.8,
        longitude: 199,
        priority: 'LOW'
      })
    ).toThrow('Longitude invalide');
  });

  it('doit rejeter la clôture sans preuve et les identifiants inexistants', () => {
    const created = service.createNCR({
      title: 'Réseau électrique',
      description: 'Contrôle final',
      projectId: 'PROJ-888',
      creatorId: 'USR-888',
      photos: ['img://proof'],
      latitude: 48.85,
      longitude: 2.35,
      priority: 'MEDIUM'
    });

    expect(() => service.closeNCR(created.id, 'USR-QSE')).toThrow(
      'Transition invalide : OPEN → CLOSED'
    );

    service.setStatus(created.id, 'RESOLVED', 'USR-QSE', 'Résolu');
    expect(() => service.closeNCR(created.id, 'USR-QSE')).toThrow(
      'Impossible de clôturer sans preuve photo'
    );
    expect(() => service.getById('ncr-404')).toThrow('NCR introuvable');
    expect(() => service.addClosureProof(created.id, '   ', 'USR-QSE')).toThrow(
      'Preuve photo de clôture obligatoire'
    );
  });
});
