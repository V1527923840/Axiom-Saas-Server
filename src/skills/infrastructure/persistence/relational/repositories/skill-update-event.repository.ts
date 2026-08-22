import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SkillUpdateEventEntity } from '../entities/skill-update-event.entity';

export interface CreateSkillUpdateEventInput {
  skillId: string;
  actorUserId: number;
  actorRole: 'self' | 'admin' | 'super_admin';
  action: 'update' | 'archive' | 'restore';
  ossKey?: string | null;
  oldHash?: string | null;
  newHash?: string | null;
  sourceFormat?: 'md' | 'zip' | null;
  changelog?: string | null;
}

@Injectable()
export class SkillUpdateEventRepository {
  constructor(
    @InjectRepository(SkillUpdateEventEntity)
    private readonly repo: Repository<SkillUpdateEventEntity>,
  ) {}

  async create(
    input: CreateSkillUpdateEventInput,
  ): Promise<SkillUpdateEventEntity> {
    return this.repo.save(
      this.repo.create({
        skillId: input.skillId,
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        action: input.action,
        ossKey: input.ossKey ?? null,
        oldHash: input.oldHash ?? null,
        newHash: input.newHash ?? null,
        sourceFormat: input.sourceFormat ?? null,
        changelog: input.changelog ?? null,
      }),
    );
  }

  async findBySkill(
    skillId: string,
    limit = 100,
  ): Promise<SkillUpdateEventEntity[]> {
    return this.repo.find({
      where: { skillId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Return the most recent event per skill for the given action. Uses
   * Postgres DISTINCT ON so a single query yields one row per
   * (skill_id) — keeps this O(1) regardless of how many archive
   * events the skills accumulated over time.
   *
   * Returns `Map<skillId, event>`; skills without any matching event
   * are absent from the map (caller falls back to null).
   */
  async findLatestByActionPerSkill(
    skillIds: string[],
    action: 'update' | 'archive' | 'restore',
  ): Promise<Map<string, SkillUpdateEventEntity>> {
    if (skillIds.length === 0) return new Map();
    const rows = await this.repo
      .createQueryBuilder('e')
      .select('e.*')
      .where('e.action = :action', { action })
      .andWhere('e.skill_id IN (:...ids)', { ids: skillIds })
      .distinctOn(['e.skill_id'])
      .orderBy('e.skill_id')
      .addOrderBy('e.created_at', 'DESC')
      .getRawMany();
    return new Map(
      rows.map((r) => [
        r.e_skill_id as string,
        {
          id: r.e_id,
          skillId: r.e_skill_id,
          actorUserId: r.e_actor_user_id,
          actorRole: r.e_actor_role,
          action: r.e_action,
          ossKey: r.e_oss_key,
          oldHash: r.e_old_hash,
          newHash: r.e_new_hash,
          sourceFormat: r.e_source_format,
          changelog: r.e_changelog,
          createdAt: new Date(r.e_created_at),
        } as SkillUpdateEventEntity,
      ]),
    );
  }
}
