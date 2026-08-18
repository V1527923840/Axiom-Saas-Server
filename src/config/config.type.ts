import { AppConfig } from './app-config.type';
import { AiAgentConfig } from './ai-agent/ai-agent.config';
import { AppleConfig } from '../auth-apple/config/apple-config.type';
import { AuthConfig } from '../auth/config/auth-config.type';
import { DatabaseConfig } from '../database/config/database-config.type';
import { FacebookConfig } from '../auth-facebook/config/facebook-config.type';
import { FileConfig } from '../files/config/file-config.type';
import { GoogleConfig } from '../auth-google/config/google-config.type';
import { MailConfig } from '../mail/config/mail-config.type';
import { SkillConfig } from './skill/skill.config';
import { VibeTradingConfig } from './vibe-trading/vibe-trading.config';

export type AllConfigType = {
  app: AppConfig;
  aiAgent: AiAgentConfig['aiAgent'];
  apple: AppleConfig;
  auth: AuthConfig;
  database: DatabaseConfig;
  facebook: FacebookConfig;
  file: FileConfig;
  google: GoogleConfig;
  mail: MailConfig;
  skill: SkillConfig['skill'];
  vibeTrading: VibeTradingConfig['vibeTrading'];
};
