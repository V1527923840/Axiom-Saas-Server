import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AllConfigType } from '../../../config/config.type';
import { RelationalAiSessionRepository } from '../persistence/relational/repositories/ai-session.repository';

@Injectable()
export class QuotaService {
  constructor(
    private readonly repo: RelationalAiSessionRepository,
    private readonly configService: ConfigService<AllConfigType>,
  ) {}

  async checkAndIncrement(sessionId: string): Promise<void> {
    const today = new Date();
    const newCount = await this.repo.incrementQuotaIfToday(sessionId, today);
    const dailyQuota =
      this.configService.get('aiAgent.dailyQuota', { infer: true }) ?? 50;
    if (newCount > dailyQuota) {
      // 回滚(简化:仅抛错,下条消息 UTC 0 点自然重置)
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Daily quota exceeded',
          errors: {
            quota: `Daily message quota (${dailyQuota}) exceeded`,
          },
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  static secondsUntilUtcMidnight(): number {
    const now = new Date();
    const next = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + 1,
        0,
        0,
        0,
      ),
    );
    return Math.ceil((next.getTime() - now.getTime()) / 1000);
  }
}
