import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ListObjectsV2Command,
  DeleteObjectsCommand,
  PutObjectCommand,
  S3Client,
  S3ClientConfig,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ConfigService } from '@nestjs/config';
import { AllConfigType } from '../config/config.type';

@Injectable()
export class OssService {
  private s3: S3Client;
  private bucket: string;

  constructor(private configService: ConfigService<AllConfigType>) {
    const region = this.configService.getOrThrow('file.awsS3Region', {
      infer: true,
    });
    const endpoint = this.configService.get('file.minioEndpoint', {
      infer: true,
    });

    const clientConfig: S3ClientConfig = {
      region,
      credentials: {
        accessKeyId: this.configService.getOrThrow('file.accessKeyId', {
          infer: true,
        }),
        secretAccessKey: this.configService.getOrThrow('file.secretAccessKey', {
          infer: true,
        }),
      },
    };

    if (endpoint) {
      clientConfig.endpoint = endpoint;
      clientConfig.forcePathStyle = true;
    }

    this.s3 = new S3Client(clientConfig);
    this.bucket = this.configService.getOrThrow('file.awsDefaultS3Bucket', {
      infer: true,
    });
  }

  async list(
    path: string = '/',
    marker?: string,
    max_keys: number = 100,
  ): Promise<{
    path: string;
    prefix: string;
    marker: string;
    max_keys: number;
    is_truncated: boolean;
    items: Array<{
      key: string;
      size: number;
      last_modified: string;
      type: 'file' | 'dir';
      file_count?: number;
    }>;
  }> {
    // S3 keys don't have leading slashes
    // For path '/test/', we want prefix 'test/' to match 'test/...'
    const prefix =
      path === '/' ? '' : path.replace(/^\//, '').replace(/([^/])$/, '$1/');

    const command = new ListObjectsV2Command({
      Bucket: this.bucket,
      Prefix: prefix,
      Delimiter: '/',
      ContinuationToken: marker,
      MaxKeys: max_keys,
    });

    const response = await this.s3.send(command);

    const items: Array<{
      key: string;
      size: number;
      last_modified: string;
      type: 'file' | 'dir';
      file_count?: number;
    }> = [];

    if (response.Contents) {
      for (const obj of response.Contents) {
        const key = obj.Key?.replace(prefix, '') || '';
        // Skip empty keys and folder markers (ending with /)
        if (!key || key.endsWith('/')) continue;

        items.push({
          key,
          size: obj.Size || 0,
          last_modified: obj.LastModified?.toISOString() || '',
          type: 'file',
        });
      }
    }

    if (response.CommonPrefixes) {
      for (const prefixItem of response.CommonPrefixes) {
        const key = prefixItem.Prefix?.replace(prefix, '') || '';
        if (!key) continue;

        // Count files in this directory (without delimiter to get all files)
        let fileCount = 0;
        try {
          const countCommand = new ListObjectsV2Command({
            Bucket: this.bucket,
            Prefix: prefixItem.Prefix,
            MaxKeys: 2, // Just need 1 to check if not empty
          });
          const countResponse = await this.s3.send(countCommand);
          const contents = countResponse.Contents || [];
          if (contents.length > 0) {
            fileCount = contents.some((c) => !c.Key?.endsWith('/'))
              ? contents.length
              : 0;
            // If only one result and it's a directory marker, folder is empty
            if (contents.length === 1 && contents[0].Key?.endsWith('/')) {
              fileCount = 0;
            }
          }
          // If truncated, there are more files
          if (countResponse.IsTruncated && fileCount > 0) {
            fileCount = -1; // Indicate "many" files
          }
        } catch {
          // Ignore count errors
        }

        items.push({
          key,
          size: 0,
          last_modified: '',
          type: 'dir',
          file_count: fileCount,
        });
      }
    }

    return {
      path,
      prefix: prefix || '/',
      marker: response.NextContinuationToken || '',
      max_keys,
      is_truncated: response.IsTruncated || false,
      items: items.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
        return a.key.localeCompare(b.key);
      }),
    };
  }

  async getDownloadUrl(
    key: string,
  ): Promise<{ url: string; expires_at: string }> {
    const command = new ListObjectsV2Command({
      Bucket: this.bucket,
      Prefix: key,
      MaxKeys: 1,
    });
    const response = await this.s3.send(command);

    if (!response.Contents || response.Contents.length === 0) {
      throw new NotFoundException(`File not found: ${key}`);
    }

    const getCommand = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    const url = await getSignedUrl(this.s3, getCommand, { expiresIn: 900 });
    const expires_at = new Date(Date.now() + 900 * 1000).toISOString();

    return { url, expires_at };
  }

  async getUploadPresignedUrl(
    key: string,
    contentType?: string,
  ): Promise<{ url: string; key: string; expires_at: string }> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType || 'application/octet-stream',
    });
    const url = await getSignedUrl(this.s3, command, { expiresIn: 900 });
    const expires_at = new Date(Date.now() + 900 * 1000).toISOString();

    return { url, key, expires_at };
  }

  async deleteFiles(
    keys: string[],
  ): Promise<{ deleted: string[]; failed: string[] }> {
    if (!keys || keys.length === 0) {
      return { deleted: [], failed: [] };
    }

    const objects = keys.map((key) => ({ Key: key }));

    try {
      const command = new DeleteObjectsCommand({
        Bucket: this.bucket,
        Delete: { Objects: objects },
      });
      await this.s3.send(command);
      return { deleted: keys, failed: [] };
    } catch {
      return { deleted: [], failed: keys };
    }
  }

  async mkdir(path: string): Promise<{ key: string }> {
    const key = path.endsWith('/') ? path : `${path}/`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: '',
      ContentLength: 0,
    });
    await this.s3.send(command);

    return { key };
  }

  async exists(key: string): Promise<boolean> {
    const command = new ListObjectsV2Command({
      Bucket: this.bucket,
      Prefix: key,
      MaxKeys: 1,
    });
    const response = await this.s3.send(command);
    return !!(response.Contents && response.Contents.length > 0);
  }
}
