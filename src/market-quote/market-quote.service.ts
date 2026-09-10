import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AllConfigType } from '../config/config.type';
import { GetDailyQuoteDto, DailyQuoteRange } from './dto/get-daily-quote.dto';

export interface DailyQuoteResponse {
  ts_code: string;
  range: DailyQuoteRange;
  bars: Array<Record<string, unknown>>;
  cached: boolean;
}

@Injectable()
export class MarketQuoteService {
  private readonly logger = new Logger(MarketQuoteService.name);

  constructor(private readonly configService: ConfigService<AllConfigType>) {}

  /**
   * Proxy request to AxiomVibeTrading backend's /api/market/quote/daily.
   * Passes user_id (from JWT) + service token (for AxiomVibeTrading).
   * Returns upstream JSON unchanged.
   */
  async proxyDailyQuote(
    dto: GetDailyQuoteDto,
    userId: string | number,
  ): Promise<DailyQuoteResponse> {
    const baseUrl = this.configService.get('vibeTrading.baseUrl', {
      infer: true,
    });
    const apiToken = this.configService.get('vibeTrading.apiToken', {
      infer: true,
    });
    const timeoutMs =
      this.configService.get('vibeTrading.timeoutMs', { infer: true }) ??
      30000;

    if (!baseUrl) {
      throw new HttpException(
        'vibeTrading.baseUrl is not configured',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const url = new URL('/api/market/quote/daily', baseUrl);
    url.searchParams.set('ts_code', dto.ts_code);
    url.searchParams.set('range', dto.range ?? '1d');
    if (dto.start_date) url.searchParams.set('start_date', dto.start_date);
    if (dto.end_date) url.searchParams.set('end_date', dto.end_date);

    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiToken ?? ''}`,
      'X-User-Id': String(userId),
    };

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (err) {
      // 网络/超时错误
      this.logger.error(`Upstream fetch failed: ${(err as Error).message}`);
      throw new HttpException(
        'Upstream K-line service unavailable',
        HttpStatus.BAD_GATEWAY,
      );
    }

    if (!response.ok) {
      // 透传上游错误状态码和 body
      const body = await response.text();
      this.logger.warn(
        `Upstream returned ${response.status} for ${dto.ts_code}: ${body}`,
      );
      throw new HttpException(
        body || `Upstream error ${response.status}`,
        response.status,
      );
    }

    return (await response.json()) as DailyQuoteResponse;
  }
}