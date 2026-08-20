import {
  Injectable,
  InternalServerErrorException,
  Logger,
  Optional,
} from '@nestjs/common';
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
import { NodeHttpHandler } from '@smithy/node-http-handler';
import * as crypto from 'crypto';
import { AllConfigType } from '../../../config/config.type';

export interface UploadResult {
  key: string;
  hash: string;
}

/** 50MB hard cap for a single skill zip. */
export const MAX_SKILL_ZIP_BYTES = 50 * 1024 * 1024;
/** Max time we wait for the *next* chunk of a streaming body before aborting. */
export const IDLE_READ_TIMEOUT_MS = 15_000;
/** TCP connect timeout for the Qiniu S3 endpoint. */
export const CONNECTION_TIMEOUT_MS = 5_000;
/** Socket read/write idle timeout enforced by the HTTP handler. */
export const SOCKET_TIMEOUT_MS = 30_000;

/**
 * SkillStorageService — 七牛云 S3 兼容模式(★ 2026-08-18 替换原 MinIO)
 *
 * 七牛云支持 S3 兼容 API(虚拟托管风格),所以我们继续用 AWS SDK,
 * 但 endpoint 指向 s3-cn-east-1.qiniucs.com,forcePathStyle=false。
 *
 *   桶:   axiom (QINIU_BUCKET)
 *   key:  skills/{skillId}/{contentHash}.zip     ← ★ 用户要求 /skills/ 前缀
 *   端点: https://{bucket}.{s3Endpoint}   (e.g. axiom.s3-cn-south-1.qiniucs.com)
 *   CDN:  https://{QINIU_DOMAIN}              ← 配置项,不要 hardcode 生产 host
 *
 * 客户端上传走 presigned PUT URL(Phase 1),后端校验走 GET(Phase 2)。
 */
@Injectable()
export class SkillStorageService {
  private readonly logger = new Logger(SkillStorageService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly cdnDomain: string;
  private readonly idleReadTimeoutMs: number;
  private readonly maxZipBytes: number;

  constructor(
    configService: ConfigService<AllConfigType>,
    // ★ 2026-08-20 修复:NestJS DI 不识别 TS 默认参数,会试图把
    // `number` 当成 provider 解析 → UnknownDependenciesException。
    // 用 @Optional() 让 Nest 跳过这两个原始类型注入,直接走 TS 默认值。
    @Optional() idleReadTimeoutMs?: number,
    @Optional() maxZipBytes?: number,
  ) {
    this.idleReadTimeoutMs = idleReadTimeoutMs ?? IDLE_READ_TIMEOUT_MS;
    this.maxZipBytes = maxZipBytes ?? MAX_SKILL_ZIP_BYTES;

    const skillCfg = configService.getOrThrow('skill', { infer: true });
    const qiniu = skillCfg.qiniu;

    if (!qiniu.accessKey || !qiniu.secretKey) {
      throw new InternalServerErrorException(
        'SkillStorageService: QINIU_ACCESS_KEY / QINIU_SECRET_KEY not configured',
      );
    }

    // ★ 七牛云 S3 兼容:用虚拟托管风格 — endpoint 不带 bucket,
    // AWS SDK 会自动加 bucket 形成 https://<bucket>.<endpoint> 形式
    // (e.g. https://axiom.s3-cn-east-1.qiniucs.com)
    const clientConfig: S3ClientConfig = {
      region: qiniu.s3Region,
      endpoint: `https://${qiniu.s3Endpoint}`,
      forcePathStyle: false,
      credentials: {
        accessKeyId: qiniu.accessKey,
        secretAccessKey: qiniu.secretKey,
      },
      // ★ 2026-08-20 生产事故修复:SDK 默认 socketTimeout=300s × maxAttempts=3
      // ≈ 982s 才失败,导致 load_skill_file 工具调用长时间卡死无响应。
      maxAttempts: 2, // 1 original + 1 retry
      requestHandler: new NodeHttpHandler({
        connectionTimeout: CONNECTION_TIMEOUT_MS,
        socketTimeout: SOCKET_TIMEOUT_MS,
        requestTimeout: SOCKET_TIMEOUT_MS,
        // smithy v4: requestTimeout 默认只打 warning,必须显式 opt-in 才会抛错
        throwOnRequestTimeout: true,
      }),
    };

    this.s3 = new S3Client(clientConfig);
    this.bucket = qiniu.bucket;
    this.cdnDomain = qiniu.domain.replace(/\/+$/, '');
  }

  /**
   * Server-side direct upload (admin path / migration). Hashes the zip
   * before storing so the storage key is content-addressed.
   */
  async upload(skillId: string, zipBlob: Buffer): Promise<UploadResult> {
    const hash = crypto.createHash('sha256').update(zipBlob).digest('hex');
    const key = this.keyOf(skillId, hash);

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
   * Presigned PUT URL for client direct upload (Phase 1 of the 2-phase flow).
   * 浏览器拿到 uploadUrl 后,直接 PUT zip bytes 到七牛云(不经过 Saas-Server)。
   *
   * @returns {{ uploadUrl, key, skillId, cdnUrl }}
   */
  async createUploadUrl(
    skillId: string,
    hash: string,
    expiresIn = 900,
  ): Promise<{
    uploadUrl: string;
    key: string;
    skillId: string;
    cdnUrl: string;
    expiresAt: number;
  }> {
    const key = this.keyOf(skillId, hash);
    const cmd = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    const uploadUrl = await getSignedUrl(this.s3, cmd, { expiresIn });
    return {
      uploadUrl,
      key,
      skillId,
      cdnUrl: `${this.cdnDomain}/${key}`,
      expiresAt: Date.now() + expiresIn * 1000,
    };
  }

  /**
   * Presigned GET URL — not used by Phase 2 (we use getObject directly).
   * Kept for symmetry with `createUploadUrl`.
   */
  async getDownloadUrl(key: string, expiresIn = 900): Promise<string> {
    const cmd = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    return getSignedUrl(this.s3, cmd, { expiresIn });
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
   *
   * 七牛云 S3 兼容:GET Object 用同一 S3Client 即可。
   *
   * 有界性保证(★ 2026-08-20):
   *  - send() 由 S3Client 的 connection/socket/request timeout + maxAttempts=2 兜底
   *  - 流式读取由 idleReadTimeoutMs 兜底(每个 chunk 之间独立计时)
   *  - 总字节数由 maxBytes 兜底,超限立即 destroy 连接
   */
  async getObject(
    key: string,
    maxBytes: number = this.maxZipBytes,
  ): Promise<Buffer> {
    const start = Date.now();
    this.logger.log(`getObject start key=${key}`);

    let result: { Body?: unknown };
    try {
      result = await this.s3.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      );
    } catch (err) {
      this.logger.warn(
        `getObject send-failed key=${key} ms=${Date.now() - start} err=${(err as Error).message}`,
      );
      throw err;
    }

    const body = result.Body as NodeJS.ReadableStream & {
      destroy: (err?: Error) => void;
    };
    const chunks: Buffer[] = [];
    let total = 0;

    // 用 iterator 协议 + Promise.race 实现 idle-read 超时:
    // 不能 wrap 整个 for-await,否则慢而稳定的大文件会被误杀 —
    // 我们要限制的是「相邻两个 chunk 之间的静默时间」,不是总时长。
    const iter = body[Symbol.asyncIterator]();
    try {
      for (;;) {
        let timer: NodeJS.Timeout | undefined;
        const chunk = await Promise.race([
          iter.next(),
          new Promise<never>((_, reject) => {
            timer = setTimeout(
              () =>
                reject(
                  new Error(
                    `idle read timeout after ${this.idleReadTimeoutMs}ms`,
                  ),
                ),
              this.idleReadTimeoutMs,
            );
          }),
        ]).finally(() => {
          if (timer) clearTimeout(timer);
        });

        if (chunk.done) break;

        const buf = Buffer.isBuffer(chunk.value)
          ? chunk.value
          : Buffer.from(chunk.value);
        chunks.push(buf);
        total += buf.length;

        if (total > maxBytes) {
          throw new InternalServerErrorException(
            `skill zip exceeds ${maxBytes} bytes`,
          );
        }
      }
    } catch (err) {
      // 必须 destroy,否则 socket 会挂在 agent pool 里泄漏
      body.destroy(err instanceof Error ? err : undefined);
      this.logger.warn(
        `getObject stream-failed key=${key} bytes=${total} ms=${Date.now() - start} err=${(err as Error).message}`,
      );
      throw err;
    }

    this.logger.log(
      `getObject ok key=${key} bytes=${total} ms=${Date.now() - start}`,
    );
    return Buffer.concat(chunks);
  }

  /**
   * Check whether a zip with this content hash already exists in Qiniu.
   */
  async existsByHash(hash: string): Promise<boolean> {
    try {
      await this.s3.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: this.keyOf('_orphans', hash),
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

  /**
   * 统一 key 前缀:所有 skill 文件存到 /skills/ 文件夹下
   * (用户要求 — 在共享 bucket axiom 下,skills/ 隔离避免污染其他业务)
   */
  private keyOf(skillId: string, hash: string): string {
    return `skills/${skillId}/${hash}.zip`;
  }
}
