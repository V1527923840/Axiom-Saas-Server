import { registerAs } from '@nestjs/config';
import { IsInt, IsOptional, IsString, IsUrl } from 'class-validator';
import validateConfig from '../../utils/validate-config';

class EnvironmentVariablesValidator {
  @IsUrl({ require_tld: false })
  @IsOptional()
  VIBE_TRADING_BASE_URL: string;

  @IsString()
  VIBE_TRADING_API_TOKEN: string;

  @IsInt()
  @IsOptional()
  VIBE_TRADING_TIMEOUT_MS: number;
}

export default registerAs('vibeTrading', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);

  return {
    baseUrl: process.env.VIBE_TRADING_BASE_URL || 'http://106.13.219.178:8899',
    apiToken: process.env.VIBE_TRADING_API_TOKEN || '',
    timeoutMs: parseInt(process.env.VIBE_TRADING_TIMEOUT_MS || '60000', 10),
  };
});

export type VibeTradingConfig = {
  vibeTrading: {
    baseUrl: string;
    apiToken: string;
    timeoutMs: number;
  };
};
