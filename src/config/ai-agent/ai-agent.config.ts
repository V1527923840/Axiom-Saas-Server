import { registerAs } from '@nestjs/config';
import { IsInt, IsOptional, Min } from 'class-validator';
import validateConfig from '../../utils/validate-config';

class EnvironmentVariablesValidator {
  @IsInt()
  @Min(1)
  @IsOptional()
  AI_AGENT_TTL_DAYS: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  AI_AGENT_TTL_GRACE_DAYS: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  AI_AGENT_DAILY_QUOTA: number;
}

export default registerAs('aiAgent', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);

  return {
    ttlDays: parseInt(process.env.AI_AGENT_TTL_DAYS || '30', 10),
    ttlGraceDays: parseInt(process.env.AI_AGENT_TTL_GRACE_DAYS || '7', 10),
    dailyQuota: parseInt(process.env.AI_AGENT_DAILY_QUOTA || '50', 10),
  };
});

export type AiAgentConfig = {
  aiAgent: {
    ttlDays: number;
    ttlGraceDays: number;
    dailyQuota: number;
  };
};
