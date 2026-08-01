import { Injectable } from '@nestjs/common';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { createHash, randomUUID } from 'crypto';

type EvidenceObject = {
  id: string;
  fileName: string;
  contentType: string;
  wormLocked: boolean;
  hashSha256: string;
  url: string;
  createdAt: string;
};

type StoreEvidenceInput = {
  fileName: string;
  contentType: string;
  payloadBase64: string;
};

@Injectable()
export class WormStorageAdapter {
  private readonly storage = new Map<string, EvidenceObject>();
  private readonly bucket = process.env.S3_WORM_BUCKET ?? '';
  private readonly region = process.env.S3_REGION ?? 'eu-west-3';
  private readonly endpoint = process.env.S3_ENDPOINT;
  private readonly s3Client = this.bucket
    ? new S3Client({
        region: this.region,
        endpoint: this.endpoint,
        forcePathStyle: Boolean(this.endpoint)
      })
    : null;

  async storeEvidence(input: StoreEvidenceInput): Promise<EvidenceObject> {
    // Identifiant aléatoire, et non `evidence-${size + 1}` : le compteur repartait
    // à 1 à chaque redémarrage du process et reformait des clés déjà écrites. Sur
    // un bucket en Object Lock COMPLIANCE, réécrire est refusé — la preuve suivante
    // était donc rejetée ou versionnée en silence.
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    const hashSha256 = createHash('sha256').update(input.payloadBase64).digest('hex');
    const key = `${id}-${input.fileName}`;
    const configured = Boolean(this.s3Client && this.bucket);

    if (this.s3Client && this.bucket) {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: Buffer.from(input.payloadBase64, 'base64'),
          ContentType: input.contentType,
          ObjectLockMode: 'COMPLIANCE',
          ObjectLockRetainUntilDate: new Date(Date.now() + 365 * 24 * 3600 * 1000),
          Metadata: {
            sha256: hashSha256
          }
        })
      );
    }

    const stored: EvidenceObject = {
      id,
      fileName: input.fileName,
      contentType: input.contentType,
      // `wormLocked` était forcé à `true` même sans bucket configuré : l'API
      // affirmait un scellement alors que rien n'avait quitté la mémoire. Sur un
      // produit à finalité probatoire, mieux vaut dire qu'on n'a pas scellé.
      wormLocked: configured,
      hashSha256,
      url: configured ? `s3://${this.bucket}/${key}` : `memory://${key}`,
      createdAt
    };

    // La charge utile n'est volontairement pas conservée : garder chaque photo en
    // mémoire ferait croître le process sans limite. Seules les métadonnées restent.
    this.storage.set(id, stored);
    return stored;
  }

  /**
   * Relit le contenu d'un objet scellé.
   *
   * L'interface ne peut pas récupérer une URL `s3://` : le contenu transite par
   * l'API, qui reste ainsi le seul point d'authentification. Exposer MinIO
   * directement, ou distribuer des URL signées, ouvrirait un accès contournant
   * le contrôle de rôles.
   */
  async readEvidence(url: string): Promise<{ body: Buffer; contentType: string } | null> {
    if (!this.s3Client || !this.bucket) {
      return null;
    }

    const prefixe = `s3://${this.bucket}/`;
    if (!url.startsWith(prefixe)) {
      return null;
    }

    const objet = await this.s3Client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: url.slice(prefixe.length) })
    );
    if (!objet.Body) {
      return null;
    }

    return {
      body: Buffer.from(await objet.Body.transformToByteArray()),
      contentType: objet.ContentType ?? 'application/octet-stream'
    };
  }
}
