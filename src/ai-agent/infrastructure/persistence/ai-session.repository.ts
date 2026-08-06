import { AiSession } from '../../domain/ai-session';
import { NullableType } from '../../../utils/types/nullable.type';

export abstract class AiSessionRepository {
  abstract findById(id: AiSession['id']): Promise<NullableType<AiSession>>;
  abstract findByIdAndUser(
    id: string,
    userId: number | string,
  ): Promise<NullableType<AiSession>>;
  abstract findManyByUser(params: {
    userId: number | string;
    agentType: string;
    page: number;
    pageSize: number;
  }): Promise<{ data: AiSession[]; total: number }>;
  abstract create(
    data: Omit<AiSession, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>,
  ): Promise<AiSession>;
  abstract update(
    id: string,
    payload: Partial<AiSession>,
  ): Promise<AiSession | null>;
  abstract softDeleteById(id: string): Promise<void>;
  abstract findExpiredForCleanup(
    now: Date,
    graceCutoff: Date,
  ): Promise<AiSession[]>;
  abstract tryAcquireInflight(
    sessionId: string,
    now: Date,
    staleCutoff: Date,
  ): Promise<boolean>;
  abstract releaseInflight(sessionId: string): Promise<void>;
  abstract incrementQuotaIfToday(
    sessionId: string,
    today: Date,
  ): Promise<number>;
}
