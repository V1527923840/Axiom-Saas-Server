import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import {
  UserSkillBindingEntity,
  BindingStatus,
} from '../entities/user-skill-binding.entity';

/**
 * Skill Plaza — UserSkillBinding repository.
 *
 * Tracks which skills a user can see. Combines three sources
 * (plan / admin_assigned / user_self) via the unique index
 * (user_id, skill_id, source, source_ref_id) with NULLS NOT DISTINCT.
 */
@Injectable()
export class UserSkillBindingRepository {
  constructor(
    @InjectRepository(UserSkillBindingEntity)
    private readonly repository: Repository<UserSkillBindingEntity>,
  ) {}

  findEnabledByUser(userId: number): Promise<UserSkillBindingEntity[]> {
    return this.repository.find({
      where: { userId, status: 'enabled' satisfies BindingStatus },
      order: { enabledAt: 'DESC' },
    });
  }

  findByUserAndSkill(
    userId: number,
    skillId: string,
  ): Promise<UserSkillBindingEntity[]> {
    return this.repository.find({ where: { userId, skillId } });
  }

  /**
   * Returns true if the user has at least one enabled binding for the skill.
   * Used by SkillResolverService.assertVisible() for authorization.
   */
  async isUserBound(userId: number, skillId: string): Promise<boolean> {
    const count = await this.repository.count({
      where: { userId, skillId, status: 'enabled' },
    });
    return count > 0;
  }

  async enable(input: Partial<UserSkillBindingEntity>): Promise<void> {
    const where =
      input.sourceRefId == null
        ? {
            userId: input.userId!,
            skillId: input.skillId!,
            source: input.source!,
            sourceRefId: IsNull(),
          }
        : {
            userId: input.userId!,
            skillId: input.skillId!,
            source: input.source!,
            sourceRefId: input.sourceRefId,
          };
    const existing = await this.repository.findOne({ where });

    if (existing) {
      existing.status = 'enabled';
      existing.enabledBy = input.enabledBy ?? existing.enabledBy;
      await this.repository.save(existing);
      return;
    }

    const entity = this.repository.create({
      ...input,
      status: 'enabled',
    });
    await this.repository.save(entity);
  }

  async disable(
    userId: number,
    skillId: string,
    source: UserSkillBindingEntity['source'],
    sourceRefId: string | null,
  ): Promise<void> {
    const where =
      sourceRefId == null
        ? { userId, skillId, source, sourceRefId: IsNull() }
        : { userId, skillId, source, sourceRefId };
    await this.repository.update(where, { status: 'disabled' });
  }

  /**
   * Used by subscription hook on unsubscribe: mark every plan-sourced
   * binding for this (user, plan) as disabled (keep row for audit).
   */
  async disableByUserAndPlan(userId: number, planId: string): Promise<void> {
    await this.repository.update(
      { userId, source: 'plan', sourceRefId: planId, status: 'enabled' },
      { status: 'disabled' },
    );
  }

  async create(
    input: Partial<UserSkillBindingEntity>,
  ): Promise<UserSkillBindingEntity> {
    const entity = this.repository.create(input);
    return this.repository.save(entity);
  }
}
