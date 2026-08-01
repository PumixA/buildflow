import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { NcrStatus } from '../../../../../libs/domain/src/models';
import {
  CreateNcrInput,
  ManagedNcr,
  NcrService as DomainNcrService
} from '../../../../../src/ncr/ncr.service';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';
import { MessagingService } from '../messaging/messaging.service';
import { WormStorageAdapter } from '../storage/worm-storage.adapter';

/**
 * Le mobile raisonne en gravité d'incident (`MINOR` / `MAJOR` / `CRITICAL`),
 * la NCR en priorité de traitement. Sans cette traduction, la contrainte de
 * colonne rejetterait `MINOR` et `MAJOR`.
 */
function severiteVersPriorite(severite?: string): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  switch ((severite ?? '').toUpperCase()) {
    case 'MINOR':
      return 'LOW';
    case 'MAJOR':
      return 'HIGH';
    case 'CRITICAL':
      return 'CRITICAL';
    default:
      return 'MEDIUM';
  }
}

/** Photo de constat attachée à une NCR et scellée dans le stockage WORM. */
export type NcrPhoto = {
  id: string;
  url: string;
  latitude: number | null;
  longitude: number | null;
  wormLocked: boolean;
  /** Renseigné à l'écriture seulement : la base ne conserve pas le hash. */
  hashSha256: string | null;
  createdAt: string;
};

/**
 * Projection commune aux lectures NCR.
 *
 * `project_name` est résolu par jointure : la colonne `project_id` contient un
 * UUID technique, que l'interface affichait tel quel à la place du code chantier.
 * Le COALESCE couvre les NCR dont le projet aurait été supprimé.
 */
const NCR_SELECT = `
  SELECT n.id, n.creator_id, n.title, n.description, n.status, n.priority,
         n.latitude, n.longitude, n.sync_status, n.local_id, n.version,
         n.created_at, n.updated_at,
         COALESCE(p.name, n.project_id::text) AS project_name
  FROM ncr n
  LEFT JOIN projects p ON p.id = n.project_id
`;

@Injectable()
export class NcrService {
  private readonly logger = new Logger(NcrService.name);
  private readonly domainService = new DomainNcrService();
  private readonly domainToDbId = new Map<string, string>();
  private readonly projectToDbId = new Map<string, string>();
  private readonly userToDbId = new Map<string, string>();

  /**
   * Lance une opération asynchrone secondaire (persistance, publication d'événement)
   * sans bloquer la réponse HTTP, mais en capturant les erreurs.
   *
   * Sans ce `.catch()`, un rejet non géré termine le process Node (>= 15).
   */
  private fireAndForget(operation: Promise<unknown>, context: string): void {
    void operation.catch((err) => {
      this.logger.error(`${context}: ${(err as Error).message}`, (err as Error).stack);
    });
  }

  constructor(
    private readonly wormStorage: WormStorageAdapter,
    private readonly auditService: AuditService,
    private readonly databaseService: DatabaseService,
    private readonly messagingService: MessagingService
  ) {}

  /**
   * La base fait autorité dès qu'elle est disponible.
   *
   * La mémoire était consultée en premier et la base seulement si elle était
   * vide : après un redémarrage la liste affichait bien les NCR persistées,
   * mais dès la première création elle ne montrait plus que celle-ci, masquant
   * toutes les autres.
   */
  async list(projectId?: string, status?: NcrStatus): Promise<ManagedNcr[]> {
    if (!this.databaseService.enabled) {
      return this.domainService.list(projectId, status);
    }

    try {
      const values: unknown[] = [];
      const filters: string[] = [];
      if (projectId) {
        values.push(projectId);
        filters.push(`p.name = $${values.length}`);
      }
      if (status) {
        values.push(status);
        filters.push(`n.status = $${values.length}`);
      }
      const where = filters.length > 0 ? ` WHERE ${filters.join(' AND ')}` : '';

      const result = await this.databaseService.query(
        `${NCR_SELECT}${where} ORDER BY n.created_at DESC LIMIT 100`,
        values
      );
      return (result.rows as Array<Record<string, unknown>>).map((row) => this.toManagedNcr(row));
    } catch (err) {
      this.logger.error(`Lecture des NCR en base échouée : ${(err as Error).message}`);
      // Mieux vaut servir la mémoire du process qu'une liste vide.
      return this.domainService.list(projectId, status);
    }
  }

  async detail(ncrId: string): Promise<ManagedNcr> {
    try {
      return this.domainService.getById(ncrId);
    } catch {
      // Absente de la mémoire : on tente la base avant de conclure.
    }

    if (this.databaseService.enabled) {
      // `id` est un UUID en base, `local_id` l'identifiant applicatif ("ncr-1") :
      // la liste peut renvoyer l'un ou l'autre selon qu'elle vienne de la mémoire
      // ou de la base, donc on accepte les deux.
      const result = await this.databaseService.query(
        `${NCR_SELECT} WHERE n.id::text = $1 OR n.local_id = $1 LIMIT 1`,
        [ncrId]
      );
      const row = result.rows[0];
      if (row) {
        return this.toManagedNcr(row as Record<string, unknown>);
      }
    }

    throw new NotFoundException(`NCR introuvable : ${ncrId}`);
  }

  private toManagedNcr(row: Record<string, unknown>): ManagedNcr {
    return {
      id: String(row['id']),
      projectId: String(row['project_name'] ?? ''),
      creatorId: String(row['creator_id'] ?? ''),
      title: String(row['title'] ?? ''),
      description: String(row['description'] ?? ''),
      status: String(row['status'] ?? 'OPEN') as NcrStatus,
      priority: String(row['priority'] ?? 'MEDIUM') as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
      latitude: Number(row['latitude'] ?? 0),
      longitude: Number(row['longitude'] ?? 0),
      photos: [],
      sync_status: Boolean(row['sync_status']),
      localId: String(row['local_id'] ?? ''),
      version: Number(row['version'] ?? 1),
      createdAt: String(row['created_at'] ?? new Date().toISOString()),
      updatedAt: String(row['updated_at'] ?? new Date().toISOString()),
      closureProofs: [],
      correctiveTasks: [],
      history: []
    } as ManagedNcr;
  }

  update(ncrId: string, partial: { title?: string; description?: string; priority?: string }): ManagedNcr {
    const updated = this.domainService.updateNcr(ncrId, partial);
    this.fireAndForget(
      this.messagingService.publish({
        topic: 'ncr.updated',
        timestamp: new Date().toISOString(),
        payload: { id: ncrId, ...partial }
      }),
      `Publication ncr.updated échouée pour ${ncrId}`
    );
    this.auditService.append('ncr.updated', 'SYSTEM', { ncrId, ...partial });
    return updated;
  }

  create(input: CreateNcrInput): ManagedNcr {
    const created = this.domainService.createNCR(input);
    this.fireAndForget(
      this.persistToDatabase(created),
      `Persistance de la NCR ${created.id} échouée`
    );
    this.fireAndForget(
      this.messagingService.publish({
        topic: 'ncr.created',
        timestamp: new Date().toISOString(),
        payload: {
          id: created.id,
          projectId: created.projectId,
          status: created.status
        }
      }),
      `Publication ncr.created échouée pour ${created.id}`
    );
    this.auditService.append('ncr.created', input.creatorId, {
      ncrId: created.id,
      projectId: created.projectId
    });
    return created;
  }

  setStatus(ncrId: string, status: NcrStatus, actorId: string, comment?: string): ManagedNcr {
    const updated = this.domainService.setStatus(ncrId, status, actorId, comment);
    this.fireAndForget(
      this.persistStatusToDatabase(ncrId, status),
      `Mise à jour du statut de ${ncrId} en base échouée`
    );
    this.fireAndForget(
      this.messagingService.publish({
        topic: 'ncr.status.updated',
        timestamp: new Date().toISOString(),
        payload: { id: ncrId, status }
      }),
      `Publication ncr.status.updated échouée pour ${ncrId}`
    );
    this.auditService.append('ncr.status.updated', actorId, { ncrId, status, comment });
    return updated;
  }

  assignTask(ncrId: string, description: string, assigneeId: string): ManagedNcr {
    const updated = this.domainService.assignCorrectiveTask(ncrId, description, assigneeId);
    this.auditService.append('ncr.task.assigned', assigneeId, { ncrId, description });
    return updated;
  }

  async addClosureProof(ncrId: string, actorId: string, fileName: string, contentType: string, payloadBase64: string): Promise<ManagedNcr> {
    const upload = await this.wormStorage.storeEvidence({ fileName, contentType, payloadBase64 });
    const updated = this.domainService.addClosureProof(ncrId, upload.url, actorId);
    this.auditService.append('ncr.closure.proof.added', actorId, { ncrId, fileName });
    return updated;
  }

  /**
   * Crée — ou met à jour — la NCR correspondant à un rapport remonté du terrain.
   *
   * `POST /sync/push` n'écrivait que dans `sync_queue` et publiait un événement
   * `sync.completed` que personne ne consomme. Un constat saisi sur le chantier
   * n'apparaissait donc jamais dans la liste des NCR : il restait dans une file
   * d'attente sans consommateur, et l'application mobile affichait « SYNCED »
   * pour une donnée qui n'existait nulle part côté métier.
   *
   * L'écriture est idempotente sur `local_id`, couvert par un index unique
   * depuis la migration 002 : rejouer une synchronisation — ce que fait le
   * mobile au retour du réseau — met à jour la NCR au lieu d'en créer une
   * seconde.
   */
  async upsertFromSync(input: {
    localId: string;
    version: number;
    title: string;
    description: string;
    severity?: string;
    latitude?: number;
    longitude?: number;
    projectId?: string;
    creatorId?: string;
  }): Promise<string | null> {
    if (!this.databaseService.enabled) {
      return null;
    }

    const projectDbId = await this.ensureProject(input.projectId?.trim() || 'PROJ-1');
    const creatorDbId = await this.ensureUser(input.creatorId?.trim() || 'MOBILE');

    const result = await this.databaseService.query(
      `
      INSERT INTO ncr (id, project_id, creator_id, title, description, status, priority,
                       latitude, longitude, sync_status, local_id, version, created_at, updated_at)
      VALUES (gen_random_uuid(),$1,$2,$3,$4,'OPEN',$5,$6,$7,TRUE,$8,$9,NOW(),NOW())
      ON CONFLICT (local_id) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        priority = EXCLUDED.priority,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        version = EXCLUDED.version,
        sync_status = TRUE,
        updated_at = NOW()
      RETURNING id
      `,
      [
        projectDbId,
        creatorDbId,
        input.title?.trim() || 'Constat terrain',
        input.description ?? '',
        severiteVersPriorite(input.severity),
        input.latitude ?? 0,
        input.longitude ?? 0,
        input.localId,
        input.version ?? 1
      ]
    );

    const row = result.rows[0] as { id: string } | undefined;
    return row?.id ?? null;
  }

  /**
   * Résout l'identifiant technique d'une NCR en base.
   *
   * Les lectures acceptent aussi bien l'UUID que le `local_id` applicatif ; les
   * écritures liées ont besoin de l'UUID, seul accepté par les clés étrangères.
   */
  private async resolveNcrDbId(ncrId: string): Promise<string> {
    if (!this.databaseService.enabled) {
      throw new NotFoundException('Base de données indisponible : photo non enregistrable');
    }

    const result = await this.databaseService.query(
      'SELECT id FROM ncr WHERE id::text = $1 OR local_id = $1 LIMIT 1',
      [ncrId]
    );
    const row = result.rows[0] as { id: string } | undefined;
    if (!row) {
      throw new NotFoundException(`NCR introuvable : ${ncrId}`);
    }
    return row.id;
  }

  /**
   * Attache une photo de constat à une NCR, scellée en WORM.
   *
   * L'existence de la NCR est vérifiée **avant** tout envoi vers le stockage.
   * `addClosureProof` fait l'inverse : il téléverse puis échoue au rattachement
   * si la NCR n'est pas dans la mémoire du process. Chaque tentative ratée laissait
   * alors un objet orphelin dans un bucket en Object Lock COMPLIANCE — donc
   * impossible à supprimer pendant un an.
   *
   * La NCR est cherchée en base et non en mémoire : une NCR remontée du mobile par
   * la synchronisation n'a jamais transité par la `Map` du service de domaine.
   */
  async addPhoto(
    ncrId: string,
    input: {
      actorId: string;
      fileName: string;
      contentType: string;
      payloadBase64: string;
      latitude?: number;
      longitude?: number;
    }
  ): Promise<NcrPhoto> {
    const ncrDbId = await this.resolveNcrDbId(ncrId);

    const upload = await this.wormStorage.storeEvidence({
      fileName: input.fileName,
      contentType: input.contentType,
      payloadBase64: input.payloadBase64
    });

    const photoId = randomUUID();
    await this.databaseService.query(
      `
      INSERT INTO ncr_photos (id, ncr_id, s3_url, geotag_lat, geotag_long, timestamp, is_worm_locked)
      VALUES ($1,$2,$3,$4,$5,NOW(),$6)
      `,
      [photoId, ncrDbId, upload.url, input.latitude ?? null, input.longitude ?? null, upload.wormLocked]
    );

    this.auditService.append('ncr.photo.added', input.actorId, {
      ncrId: ncrDbId,
      photoId,
      fileName: input.fileName,
      hashSha256: upload.hashSha256,
      wormLocked: upload.wormLocked
    });

    return {
      id: photoId,
      url: upload.url,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      wormLocked: upload.wormLocked,
      hashSha256: upload.hashSha256,
      createdAt: upload.createdAt
    };
  }

  /** Relit le contenu binaire d'une photo, pour le servir à l'interface. */
  async readPhoto(ncrId: string, photoId: string): Promise<{ body: Buffer; contentType: string }> {
    if (!this.databaseService.enabled) {
      throw new NotFoundException('Photo introuvable');
    }

    const result = await this.databaseService.query(
      `
      SELECT p.s3_url
      FROM ncr_photos p
      JOIN ncr n ON n.id = p.ncr_id
      WHERE p.id::text = $1 AND (n.id::text = $2 OR n.local_id = $2)
      LIMIT 1
      `,
      [photoId, ncrId]
    );

    const row = result.rows[0] as { s3_url: string } | undefined;
    if (!row) {
      throw new NotFoundException('Photo introuvable');
    }

    const contenu = await this.wormStorage.readEvidence(row.s3_url);
    if (!contenu) {
      // L'objet est référencé en base mais absent du stockage : le dire plutôt
      // que de renvoyer une image vide qui passerait pour une photo blanche.
      throw new NotFoundException('Contenu de la photo indisponible');
    }
    return contenu;
  }

  /** Photos attachées à une NCR, les plus récentes d'abord. */
  async listPhotos(ncrId: string): Promise<NcrPhoto[]> {
    if (!this.databaseService.enabled) {
      return [];
    }

    try {
      const result = await this.databaseService.query(
        `
        SELECT p.id, p.s3_url, p.geotag_lat, p.geotag_long, p.timestamp, p.is_worm_locked
        FROM ncr_photos p
        JOIN ncr n ON n.id = p.ncr_id
        WHERE n.id::text = $1 OR n.local_id = $1
        ORDER BY p.timestamp DESC
        `,
        [ncrId]
      );

      return (result.rows as Array<Record<string, unknown>>).map((row) => ({
        id: String(row.id),
        url: String(row.s3_url ?? ''),
        latitude: row.geotag_lat === null ? null : Number(row.geotag_lat),
        longitude: row.geotag_long === null ? null : Number(row.geotag_long),
        wormLocked: Boolean(row.is_worm_locked),
        hashSha256: null,
        createdAt: new Date(String(row.timestamp)).toISOString()
      }));
    } catch (err) {
      this.logger.error(`Lecture des photos échouée : ${(err as Error).message}`);
      return [];
    }
  }

  close(ncrId: string, validatorId: string): ManagedNcr {
    const updated = this.domainService.closeNCR(ncrId, validatorId);
    this.fireAndForget(
      this.messagingService.publish({
        topic: 'ncr.closed',
        timestamp: new Date().toISOString(),
        payload: { id: ncrId, validatorId }
      }),
      `Publication ncr.closed échouée pour ${ncrId}`
    );
    this.auditService.append('ncr.closed', validatorId, { ncrId });
    return updated;
  }

  private async persistToDatabase(ncr: ManagedNcr): Promise<void> {
    if (!this.databaseService.enabled) return;
    const dbId = this.domainToDbId.get(ncr.id) ?? randomUUID();
    this.domainToDbId.set(ncr.id, dbId);
    const projectDbId = await this.ensureProject(ncr.projectId);
    const creatorDbId = await this.ensureUser(ncr.creatorId);
    await this.databaseService.query(
      `INSERT INTO ncr (id, project_id, creator_id, title, description, status, priority,
        latitude, longitude, sync_status, local_id, version, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW(),NOW())
       ON CONFLICT (id) DO UPDATE SET status=$6, priority=$7, updated_at=NOW()`,
      [dbId, projectDbId, creatorDbId, ncr.title, ncr.description, ncr.status, ncr.priority,
       ncr.latitude, ncr.longitude, ncr.sync_status, ncr.localId, ncr.version]
    );
  }

  private async persistStatusToDatabase(ncrId: string, status: string): Promise<void> {
    if (!this.databaseService.enabled) return;
    const dbId = this.domainToDbId.get(ncrId);
    if (!dbId) return;
    await this.databaseService.query(
      `UPDATE ncr SET status=$1, updated_at=NOW() WHERE id=$2`, [status, dbId]
    );
  }

  private async ensureProject(projectCode: string): Promise<string> {
    const fromMemory = this.projectToDbId.get(projectCode);
    if (fromMemory) return fromMemory;

    // `projects.name` n'a pas de contrainte d'unicité : impossible d'écrire un upsert
    // atomique comme pour `users`. Deux créations simultanées d'un même chantier
    // produisent donc deux lignes. À traiter avec l'index unique sur projects(name),
    // dans le lot d'alignement du schéma.
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
    if (fromMemory) return fromMemory;

    // Enregistrement technique dérivé d'un code auteur, pas un compte : `hashed_password`
    // est NOT NULL en base et ne doit correspondre à aucun hash vérifiable.
    //
    // Upsert atomique plutôt que SELECT-puis-INSERT : deux créations simultanées
    // passeraient toutes deux le SELECT et la seconde violerait `users_email_key`.
    // `DO UPDATE` (et non `DO NOTHING`) garantit que RETURNING renvoie toujours la ligne.
    // Le code auteur est un identifiant applicatif ("USER-1") côté mobile, mais
    // l'adresse du compte connecté côté web. Sans ce test on fabriquait
    // "admin@buildflow.io@buildflow.io" et chaque saisie web créait un
    // enregistrement distinct.
    const normalized = userCode.toLowerCase();
    const email = normalized.includes('@') ? normalized : `${normalized}@buildflow.io`;
    const result = await this.databaseService.query(
      `INSERT INTO users (id, name, email, role, hashed_password, mfa_enabled, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,NOW())
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [randomUUID(), userCode, email, 'CHEF_CHANTIER', 'hash-placeholder', true]
    );
    const userId = (result.rows[0] as { id: string }).id;
    this.userToDbId.set(userCode, userId);
    return userId;
  }
}
