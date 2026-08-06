import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThan, Repository } from 'typeorm';
import { AiSessionEntity } from '../entities/ai-session.entity';
import { AiSession } from '../../../../domain/ai-session';
import { AiSessionMapper } from '../mappers/ai-session.mapper';
import { AiSessionRepository } from '../../ai-session.repository';

@Injectable()
export class RelationalAiSessionRepository extends AiSessionRepository {
  constructor(
    @InjectRepository(AiSessionEntity)
    private readonly repository: Repository<AiSessionEntity>,
  ) {
    super();
  }

  async findById(id: AiSession['id']) {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? AiSessionMapper.toDomain(entity) : null;
  }

  async findByIdAndUser(id: string, userId: number | string) {
    const entity = await this.repository.findOne({ where: { id, userId } });
    return entity ? AiSessionMapper.toDomain(entity) : null;
  }

  async findManyByUser({
    userId,
    agentType,
    page,
    pageSize,
  }: {
    userId: number | string;
    agentType: string;
    page: number;
    pageSize: number;
  }) {
    const [rows, total] = await this.repository.findAndCount({
      where: { userId, agentType, deletedAt: IsNull() },
      order: { lastActiveAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { data: rows.map(AiSessionMapper.toDomain), total };
  }

  async create(
    data: Omit<AiSession, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>,
  ): Promise<AiSession> {
    const entity = this.repository.create(AiSessionMapper.toPersistence(data));
    const saved = await this.repository.save(entity);
    return AiSessionMapper.toDomain(saved);
  }

  async update(
    id: string,
    payload: Partial<AiSession>,
  ): Promise<AiSession | null> {
    const entity = await this.repository.findOne({ where: { id } });
    if (!entity) return null;
    Object.assign(entity, AiSessionMapper.toPersistence(payload));
    const saved = await this.repository.save(entity);
    return AiSessionMapper.toDomain(saved);
  }

  async softDeleteById(id: string): Promise<void> {
    await this.repository.softDelete({ id });
  }

  async findExpiredForCleanup(
    now: Date,
    graceCutoff: Date,
  ): Promise<AiSession[]> {
    const rows = await this.repository.find({
      where: { deletedAt: IsNull(), expiresAt: LessThan(graceCutoff) },
      take: 200,
    });
    return rows.map(AiSessionMapper.toDomain);
  }

  async tryAcquireInflight(
    sessionId: string,
    now: Date,
    staleCutoff: Date,
  ): Promise<boolean> {
    const result = await this.repository
      .createQueryBuilder()
      .update(AiSessionEntity)
      .set({ inflightStartedAt: now })
      .where('id = :id', { id: sessionId })
      .andWhere('deleted_at IS NULL')
      .andWhere(
        '(inflight_started_at IS NULL OR inflight_started_at < :stale)',
        { stale: staleCutoff },
      )
      .execute();
    return (result.affected ?? 0) > 0;
  }

  async releaseInflight(sessionId: string): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update(AiSessionEntity)
      .set({ inflightStartedAt: null })
      .where('id = :id', { id: sessionId })
      .execute();
  }

  async incrementQuotaIfToday(sessionId: string, today: Date): Promise<number> {
    // Atomic: if quota_date != today, reset to 1; otherwise +1.
    // The CASE expression yields the new quota_count in a single statement,
    // avoiding the race window of a read-then-write separate UPDATE.
    await this.repository
      .createQueryBuilder()
      .update(AiSessionEntity)
      .set({
        quotaCount: () =>
          `CASE WHEN quota_date = :today THEN quota_count + 1 ELSE 1 END`,
        quotaDate: today,
      })
      .where('id = :id', {
        id: sessionId,
        today: today.toISOString().slice(0, 10),
      })
      .execute();
    const entity = await this.repository.findOne({ where: { id: sessionId } });
    return entity?.quotaCount ?? 0;
  }
}
