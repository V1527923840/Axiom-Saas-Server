import { AiSession } from '../../../../domain/ai-session';
import { AiSessionEntity } from '../entities/ai-session.entity';

export class AiSessionMapper {
  static toDomain(entity: AiSessionEntity): AiSession {
    if (!entity) return entity;
    const domain = new AiSession();
    domain.id = entity.id;
    domain.userId = entity.userId;
    domain.agentType = entity.agentType;
    domain.remoteSessionId = entity.remoteSessionId;
    domain.title = entity.title;
    domain.status = entity.status as AiSession['status'];
    domain.lastActiveAt = entity.lastActiveAt;
    domain.expiresAt = entity.expiresAt;
    domain.quotaCount = entity.quotaCount;
    domain.quotaDate = entity.quotaDate;
    domain.inflightStartedAt = entity.inflightStartedAt;
    domain.createdAt = entity.createdAt;
    domain.updatedAt = entity.updatedAt;
    domain.deletedAt = entity.deletedAt;
    return domain;
  }

  static toPersistence(domain: Partial<AiSession>): Partial<AiSessionEntity> {
    const out: Partial<AiSessionEntity> = {};
    if (domain.userId !== undefined) out.userId = domain.userId;
    if (domain.agentType !== undefined) out.agentType = domain.agentType;
    if (domain.remoteSessionId !== undefined)
      out.remoteSessionId = domain.remoteSessionId;
    if (domain.title !== undefined) out.title = domain.title;
    if (domain.status !== undefined) out.status = domain.status;
    if (domain.lastActiveAt !== undefined)
      out.lastActiveAt = domain.lastActiveAt;
    if (domain.expiresAt !== undefined) out.expiresAt = domain.expiresAt;
    if (domain.quotaCount !== undefined) out.quotaCount = domain.quotaCount;
    if (domain.quotaDate !== undefined) {
      // Domain allows Date | string (Postgres `date` column may return string);
      // entity column type is `date`, which TypeORM serializes as Date.
      out.quotaDate =
        domain.quotaDate instanceof Date
          ? domain.quotaDate
          : new Date(domain.quotaDate);
    }
    if (domain.inflightStartedAt !== undefined)
      out.inflightStartedAt = domain.inflightStartedAt;
    return out;
  }
}
