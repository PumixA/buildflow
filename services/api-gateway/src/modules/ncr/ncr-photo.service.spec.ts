import { NotFoundException } from '@nestjs/common';
import { QueryResult } from 'pg';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';
import { MessagingService } from '../messaging/messaging.service';
import { WormStorageAdapter } from '../storage/worm-storage.adapter';
import { NcrService } from './ncr.service';

const NCR_DB_ID = '9e8804bd-b401-4525-9f33-38ccc1a2256d';

function resultat(rows: Array<Record<string, unknown>>): QueryResult<Record<string, unknown>> {
  return { rows, rowCount: rows.length, command: 'SELECT', oid: 0, fields: [] };
}

type Montage = {
  service: NcrService;
  requetes: string[];
  televersements: number;
};

/**
 * `ncrPresente: false` simule une NCR absente de la base — le cas d'une requête
 * portant un identifiant erroné, ou d'une NCR supprimée entre-temps.
 */
function construire(options: { ncrPresente?: boolean; wormLocked?: boolean } = {}): Montage {
  const requetes: string[] = [];
  const etat = { televersements: 0 };

  const database = {
    get enabled() {
      return true;
    },
    query: (sql: string) => {
      requetes.push(sql);
      if (sql.includes('SELECT id FROM ncr')) {
        return Promise.resolve(options.ncrPresente === false ? resultat([]) : resultat([{ id: NCR_DB_ID }]));
      }
      return Promise.resolve(resultat([]));
    }
  } as unknown as DatabaseService;

  const worm = {
    storeEvidence: () => {
      etat.televersements += 1;
      return Promise.resolve({
        id: 'evidence-uuid',
        fileName: 'constat.png',
        contentType: 'image/png',
        wormLocked: options.wormLocked ?? true,
        hashSha256: 'abc123',
        url: 's3://buildflow-worm-evidences/uuid-constat.png',
        createdAt: '2026-07-31T10:00:00.000Z'
      });
    }
  } as unknown as WormStorageAdapter;

  const audit = { append: () => undefined } as unknown as AuditService;
  const messaging = { publish: () => Promise.resolve() } as unknown as MessagingService;

  const service = new NcrService(worm, audit, database, messaging);
  return {
    service,
    requetes,
    get televersements() {
      return etat.televersements;
    }
  } as Montage;
}

const photo = {
  actorId: 'USR-QSE',
  fileName: 'constat.png',
  contentType: 'image/png',
  payloadBase64: 'iVBORw0KGgo=',
  latitude: 48.8566,
  longitude: 2.3522
};

describe('NcrService.addPhoto', () => {
  it('doit sceller la photo et l’enregistrer dans ncr_photos', async () => {
    const { service, requetes } = construire();

    const resultat = await service.addPhoto(NCR_DB_ID, photo);

    expect(resultat.url).toBe('s3://buildflow-worm-evidences/uuid-constat.png');
    expect(resultat.wormLocked).toBe(true);
    expect(resultat.latitude).toBe(48.8566);
    expect(requetes.some((sql) => sql.includes('INSERT INTO ncr_photos'))).toBe(true);
  });

  it('doit refuser en 404 une NCR inexistante, sans rien téléverser', async () => {
    // Régression : l'implémentation d'origine téléversait *avant* de vérifier
    // l'existence. Chaque échec laissait un objet orphelin dans un bucket en
    // Object Lock COMPLIANCE, donc indestructible pendant un an.
    const montage = construire({ ncrPresente: false });

    await expect(montage.service.addPhoto('inconnue', photo)).rejects.toBeInstanceOf(NotFoundException);
    expect(montage.televersements).toBe(0);
  });

  it('doit chercher la NCR par UUID comme par local_id', async () => {
    const { service, requetes } = construire();

    await service.addPhoto('ncr-1', photo);

    const lookup = requetes.find((sql) => sql.includes('SELECT id FROM ncr'));
    expect(lookup).toContain('id::text = $1');
    expect(lookup).toContain('local_id = $1');
  });

  it('doit refléter un scellement absent plutôt que de l’affirmer', async () => {
    const { service } = construire({ wormLocked: false });

    const resultat = await service.addPhoto(NCR_DB_ID, photo);

    expect(resultat.wormLocked).toBe(false);
  });

  it('doit accepter une photo sans géolocalisation', async () => {
    const { service } = construire();

    const resultat = await service.addPhoto(NCR_DB_ID, {
      actorId: 'USR-QSE',
      fileName: 'constat.png',
      contentType: 'image/png',
      payloadBase64: 'iVBORw0KGgo='
    });

    expect(resultat.latitude).toBeNull();
    expect(resultat.longitude).toBeNull();
  });
});
