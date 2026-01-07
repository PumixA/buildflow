import { NCRService } from './ncr.service';

describe('NCRService - Validation Qualité', () => {
    let service: NCRService;

    beforeEach(() => {
        service = new NCRService();
    });

    it('doit rejeter une NCR si aucune photo n est jointe', async () => {
        const ncrData = { title: "Fissure dalle", photos: [] };
        // On vérifie que la règle métier de preuve photo est respectée
        expect(() => service.createNCR(ncrData)).toThrow('Photo obligatoire');
    });

    it('doit marquer la NCR comme "non synchronisée" par défaut (Offline-first)', async () => {
        const ncrData = { title: "Défaut étanchéité", photos: ["url_photo_1"] };
        const result = await service.createNCR(ncrData);
        // Vérification du flag de synchronisation pour le Livrable 2
        expect(result.sync_status).toBe(false);
    });
});