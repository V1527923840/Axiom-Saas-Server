import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  S3ClientConfig,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as crypto from 'crypto';
import { AllConfigType } from '../../../config/config.type';

export interface UploadResult {
  key: string;
  hash: string;
}

@Injectable()
export class SkillStorageService {
  private readonly logger = new Logger(SkillStorageService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(configService: ConfigService<AllConfigType>) {
    const region = configService.getOrThrow('file.awsS3Region', {
      infer: true,
    });
    const endpoint = configService.get('file.minioEndpoint', {
      infer: true,
    });

    const clientConfig: S3ClientConfig = {
      region,
      credentials: {
        accessKeyId: configService.getOrThrow('file.accessKeyId', {
          infer: true,
        }),
        secretAccessKey: configService.getOrThrow('file.secretAccessKey', {
          infer: true,
        }),
      },
    };

    if (endpoint) {
      clientConfig.endpoint = endpoint;
      clientConfig.forcePathStyle = true;
    }

    this.s3 = new S3Client(clientConfig);
    // skill.ossBucket has a default (axiom-skills-dev) so it's optional in config;
    // use get() and fallback defensively to the same default.
    this.bucket =
      configService.get('skill.ossBucket', { infer: true }) ??
      'axiom-skills-dev';
  }

  /**
   * Upload a skill zip blob. Key is content-addressed so identical zips
   * overwrite the same object (idempotent). Hash = sha256(zip).
   */
  async upload(skillId: string, zipBlob: Buffer): Promise<UploadResult> {
    const hash = crypto.createHash('sha256').update(zipBlob).digest('hex');
    const key = `skills/${skillId}/${hash}.zip`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: zipBlob,
        ContentType: 'application/zip',
      }),
    );

    this.logger.log(`uploaded skill zip skillId=${skillId} hash=${hash}`);
    return { key, hash };
  }

  /**
   * Presigned GET URL for downloading a skill zip.
   */
  async getDownloadUrl(key: string): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    return getSignedUrl(this.s3, command, { expiresIn: 900 });
  }

  /**
   * Delete a single object. Errors are logged but not rethrown so callers
   * (e.g. orphan cleanup) can best-effort sweep without aborting.
   */
  async delete(key: string): Promise<void> {
    try {
      await this.s3.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      this.logger.log(`deleted skill blob key=${key}`);
    } catch (err) {
      this.logger.warn(
        `failed to delete skill blob key=${key}: ${(err as Error).message}`,
      );
    }
  }

  /**
   * Download a skill zip blob. Streams to a Buffer. Used by the upload
   * confirm pipeline to re-verify sha256 against the client claim.
   */
  async getObject(key: string): Promise<Buffer> {
    const result = await this.s3.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    const body = result.Body as NodeJS.ReadableStream;
    const chunks: Buffer[] = [];
    for await (const chunk of body) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  /**
   * Check whether a zip with this content hash already exists in OSS.
   * Used by orphan cleanup to detect blobs no longer referenced by any skill.
   */
  async existsByHash(hash: string): Promise<boolean> {
    try {
      await this.s3.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: `skills/_orphans/${hash}.zip`,
        }),
      );
      return true;
    } catch (err: any) {
      if (err?.$metadata?.httpStatusCode === 404 || err?.name === 'NotFound') {
        return false;
      }
      // Re-throw unexpected errors (auth, 5xx) so cleanup job can retry.
      throw err;
    }
  }
}
