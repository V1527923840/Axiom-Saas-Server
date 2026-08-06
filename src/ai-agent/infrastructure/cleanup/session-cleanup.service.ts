import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { AllConfigType } from '../../../config/config.type';
import { RelationalAiSessionRepository } from '../persistence/relational/repositories/ai-session.repository';

@Injectable()
export class SessionCleanupService {
  private readonly logger = new Logger(SessionCleanupService.name);

  constructor(
    private readonly repo: RelationalAiSessionRepository,
    private readonly configService: ConfigService<AllConfigType>,
  ) {}

  @Cron('0 3 * * *') // 每日 03:00
  async scheduledCleanup(): Promise<void> {
    await this.runOnce(new Date());
  }

  async runOnce(now: Date): Promise<number> {
    const ttlGraceDays =
      this.configService.get('aiAgent.ttlGraceDays', { infer: true }) ?? 7;
    const graceCutoff = new Date(now.getTime() - ttlGraceDays * 86400_000);
    const expired = await this.repo.findExpiredForCleanup(now, graceCutoff);
    for (const s of expired) {
      try {
        await this.repo.softDeleteById(s.id);
      } catch (e) {
        this.logger.warn(
          `cleanup failed for session ${s.id}: ${(e as Error).message}`,
        );
      }
    }
    this.logger.log(`cleanup: soft-deleted ${expired.length} expired sessions`);
    return expired.length;
  }
}
