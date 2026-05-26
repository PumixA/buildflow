import { Injectable } from '@nestjs/common';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { createHash } from 'crypto';

type EvidenceObject = {
  id: string;
  fileName: string;
  contentType: string;
  payloadBase64: string;
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
  private readonly s3Client = this.bucket ? new S3Client({ region: this.region }) : null;

  async storeEvidence(input: StoreEvidenceInput): Promise<EvidenceObject> {
    const id = `evidence-${this.storage.size + 1}`;
    const createdAt = new Date().toISOString();
    const hashSha256 = createHash('sha256').update(input.payloadBase64).digest('hex');
    const key = `${id}-${input.fileName}`;
    const wormLocked = true;

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
      payloadBase64: input.payloadBase64,
      wormLocked,
      hashSha256,
      url: this.bucket ? `s3://${this.bucket}/${key}` : `s3://buildflow-worm/${key}`,
      createdAt
    };

    this.storage.set(id, stored);
    return stored;
  }

  getEvidence(id: string): EvidenceObject | undefined {
    return this.storage.get(id);
  }
}
