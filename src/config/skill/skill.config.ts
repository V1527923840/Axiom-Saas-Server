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
    ossBucket: process.env.SKILL_OSS_BUCKET || 'axiom-skills-dev',
    serviceToken: process.env.SKILL_SERVICE_TOKEN || 'dev-skill-service-token',
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
    maxFileSizeKb: number;
    maxTotalSizeKb: number;
    maxUserQuota: number;
    resolveTimeoutMs: number;
  };
};
