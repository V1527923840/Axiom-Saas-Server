import { registerAs } from '@nestjs/config';

export default registerAs('aiAgent', () => ({
  ttlDays: parseInt(process.env.AI_AGENT_TTL_DAYS || '30', 10),
  ttlGraceDays: parseInt(process.env.AI_AGENT_TTL_GRACE_DAYS || '7', 10),
  dailyQuota: parseInt(process.env.AI_AGENT_DAILY_QUOTA || '50', 10),
}));

export type AiAgentConfig = {
  aiAgent: {
    ttlDays: number;
    ttlGraceDays: number;
    dailyQuota: number;
  };
};
