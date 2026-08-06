import { registerAs } from '@nestjs/config';

export default registerAs('vibeTrading', () => ({
  baseUrl: process.env.VIBE_TRADING_BASE_URL || 'http://106.13.219.178:8899',
  apiToken: process.env.VIBE_TRADING_API_TOKEN || '',
  timeoutMs: parseInt(process.env.VIBE_TRADING_TIMEOUT_MS || '60000', 10),
}));

export type VibeTradingConfig = {
  vibeTrading: {
    baseUrl: string;
    apiToken: string;
    timeoutMs: number;
  };
};
