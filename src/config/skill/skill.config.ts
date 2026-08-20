import { registerAs } from '@nestjs/config';
import { IsInt, IsOptional, IsString } from 'class-validator';
import validateConfig from '../../utils/validate-config';

class EnvironmentVariablesValidator {
  @IsString()
  @IsOptional()
  SKILL_OSS_BUCKET: string;

  @IsString()
  @IsOptional()
  SKILL_SERVICE_TOKEN: string;

  @IsInt()
  @IsOptional()
  SKILL_MAX_FILE_SIZE_KB: number;

  @IsInt()
  @IsOptional()
  SKILL_MAX_TOTAL_SIZE_KB: number;

  @IsInt()
  @IsOptional()
  SKILL_MAX_USER_QUOTA: number;

  @IsInt()
  @IsOptional()
  SKILL_RESOLVE_TIMEOUT_MS: number;
}

export default registerAs('skill', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);

  return {
    ossBucket: process.env.SKILL_OSS_BUCKET || 'axiom',
    serviceToken: process.env.SKILL_SERVICE_TOKEN || 'dev-skill-service-token',
    // ★ 七牛云 S3 兼容端点配置(替换原 MinIO)
    qiniu: {
      accessKey: process.env.QINIU_ACCESS_KEY || '',
      secretKey: process.env.QINIU_SECRET_KEY || '',
      bucket: process.env.QINIU_BUCKET || 'axiom',
      // ★ QINIU_DOMAIN 必须由环境变量注入 —— 不要 hardcode 生产 CDN host。
      //   没有该变量时 buildPublicUrl 会落到空字符串，调用方会立刻
      //   看到 502 而不是沉默失败。如果你的环境没设它，先去 .env 或
      //   secrets manager 配置，不要在这里加 fallback URL。
      domain: process.env.QINIU_DOMAIN || '',
      // 七牛云 S3 兼容端点(华东 cn-east-1 默认)
      s3Endpoint: process.env.QINIU_S3_ENDPOINT || 's3-cn-south-1.qiniucs.com',
      s3Region: process.env.QINIU_S3_REGION || 'cn-south-1',
    },
    maxFileSizeKb: parseInt(process.env.SKILL_MAX_FILE_SIZE_KB || '256', 10),
    maxTotalSizeKb: parseInt(
      process.env.SKILL_MAX_TOTAL_SIZE_KB || '10240',
      10,
    ),
    maxUserQuota: parseInt(process.env.SKILL_MAX_USER_QUOTA || '50', 10),
    resolveTimeoutMs: parseInt(
      process.env.SKILL_RESOLVE_TIMEOUT_MS || '500',
      10,
    ),
  };
});

export type SkillConfig = {
  skill: {
    ossBucket: string;
    serviceToken: string;
    qiniu: {
      accessKey: string;
      secretKey: string;
      bucket: string;
      domain: string;
      s3Endpoint: string;
      s3Region: string;
    };
    maxFileSizeKb: number;
    maxTotalSizeKb: number;
    maxUserQuota: number;
    resolveTimeoutMs: number;
  };
};
