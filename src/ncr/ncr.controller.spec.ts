import { NcrController } from './ncr.controller';
import { NcrService } from './ncr.service';

describe('NcrController', () => {
  let controller: NcrController;

  beforeEach(() => {
    controller = new NcrController(new NcrService());
  });

  it('doit créer puis retourner le détail d une NCR', () => {
    const created = controller.create({
      title: 'Ecart dimensionnel',
      description: 'Cloison hors tolérance',
      projectId: 'PROJ-010',
      creatorId: 'USR-010',
      photos: ['img://proof'],
      latitude: 45.764,
      longitude: 4.836,
      priority: 'MEDIUM'
    });

    const detail = controller.detail(created.id);
    expect(detail.id).toBe(created.id);
    expect(detail.projectId).toBe('PROJ-010');
  });

  it('doit lister par projet et statut', () => {
    const first = controller.create({
      title: 'NCR 1',
      description: 'Analyse',
      projectId: 'PROJ-011',
      creatorId: 'USR-011',
      photos: ['img://1'],
      latitude: 45.7,
      longitude: 4.8,
      priority: 'LOW'
    });

    controller.create({
      title: 'NCR 2',
      description: 'Autre',
      projectId: 'PROJ-999',
      creatorId: 'USR-999',
      photos: ['img://2'],
      latitude: 45.7,
      longitude: 4.8,
      priority: 'LOW'
    });

    const filtered = controller.list('PROJ-011', 'OPEN');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe(first.id);
  });
});
