import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { RelationalAiSessionRepository } from '../persistence/relational/repositories/ai-session.repository';

@Injectable()
export class ConcurrencyService {
  private static readonly STALE_LOCK_MS = 5 * 60 * 1000; // 5 minutes

  constructor(private readonly repo: RelationalAiSessionRepository) {}

  async acquire(sessionId: string): Promise<void> {
    const now = new Date();
    const staleCutoff = new Date(
      now.getTime() - ConcurrencyService.STALE_LOCK_MS,
    );
    const acquired = await this.repo.tryAcquireInflight(
      sessionId,
      now,
      staleCutoff,
    );
    if (!acquired) {
      throw new HttpException(
        {
          statusCode: HttpStatus.CONFLICT,
          message: 'Another message is in flight',
          errors: {
            concurrency: 'Another message is in flight for this session',
          },
        },
        HttpStatus.CONFLICT,
      );
    }
  }

  async release(sessionId: string): Promise<void> {
    await this.repo.releaseInflight(sessionId);
  }
}
