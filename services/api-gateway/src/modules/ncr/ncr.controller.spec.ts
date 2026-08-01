import { Test, TestingModule } from '@nestjs/testing';
import { NcrController } from './ncr.controller';
import { NcrService } from './ncr.service';

describe('NcrController', () => {
  let controller: NcrController;

  beforeEach(async () => {
    const mockNcr = {
      id: 'ncr-1', projectId: 'PROJ-1', creatorId: 'USR-1', title: 'Test NCR',
      description: 'Desc', status: 'OPEN', priority: 'HIGH',
      latitude: 48.85, longitude: 2.35, photos: [], sync_status: false,
      localId: 'local-1', version: 1, createdAt: '2026-01-01', updatedAt: '2026-01-01',
      closureProofs: [], correctiveTasks: [], history: []
    };

    const mockService = {
      list: () => Promise.resolve([mockNcr]),
      detail: () => mockNcr,
      create: (input: Record<string, unknown>) => Promise.resolve({ ...mockNcr, ...input }),
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      update: (id: string, partial: Record<string, unknown>) => ({ ...mockNcr, ...partial }),
      setStatus: () => mockNcr,
      assignTask: () => mockNcr,
      addClosureProof: () => Promise.resolve(mockNcr),
      close: () => mockNcr
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NcrController],
      providers: [{ provide: NcrService, useValue: mockService }]
    }).compile();

    controller = module.get<NcrController>(NcrController);
  });

  it('should list NCRs with pagination', async () => {
    const result = await controller.list(undefined, undefined, '1', '20');
    expect(result.items.length).toBe(1);
    expect(result.total).toBe(1);
  });

  it('should create an NCR', async () => {
    const result = await controller.create({
      projectId: 'PROJ-1', creatorId: 'USR-1', title: 'New NCR',
      description: 'Desc', priority: 'HIGH', latitude: 48.8, longitude: 2.3, photos: []
    } as never);
    expect(result.title).toBe('New NCR');
  });

  it('should update an NCR', () => {
    const result = controller.update('ncr-1', { title: 'Updated' });
    expect(result.title).toBe('Updated');
  });
});
