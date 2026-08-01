import { MigrationService } from './migration.service';
import { DatabaseService } from './database.service';

describe('MigrationService', () => {
  it('should skip migrations when DB is disabled', async () => {
    const mockDb = { enabled: false, query: jest.fn() } as unknown as DatabaseService;
    const service = new MigrationService(mockDb);
    // Override directory to a non-existent path
    Object.defineProperty(service, 'directory', { value: '/nonexistent' });

    // Should not throw — returns early when DB disabled
    await expect(service.onModuleInit()).resolves.toBeUndefined();
  });

  it('should fail if migration directory is missing', async () => {
    const mockDb = { enabled: true, query: jest.fn() } as unknown as DatabaseService;
    const service = new MigrationService(mockDb);
    Object.defineProperty(service, 'directory', { value: '/nonexistent/migrations' });

    await expect(service.onModuleInit()).rejects.toThrow('Répertoire de migrations introuvable');
  });
});
