import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { SkillRepository } from './infrastructure/persistence/relational/repositories/skill.repository';
import { SkillUpdateEventRepository } from './infrastructure/persistence/relational/repositories/skill-update-event.repository';
import { SkillEntity } from './infrastructure/persistence/relational/entities/skill.entity';
import { SkillUpdateEventEntity } from './infrastructure/persistence/relational/entities/skill-update-event.entity';
import { UserSkillBindingEntity } from './infrastructure/persistence/relational/entities/user-skill-binding.entity';

@Injectable()
export class SkillLifecycleService {
  constructor(
    private readonly skillRepo: SkillRepository,
    private readonly eventRepo: SkillUpdateEventRepository,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  /**
   * Archive a skill.
   *
   * Three writes, wrapped in a single transaction so a partial failure
   * cannot leave a half-archived state:
   *   1. flip `skill.status` → 'archived'
   *   2. insert audit row in `skill_update_event`
   *   3. cascade: disable every enabled `user_skill_binding` pointing
   *      at this skill (plan / admin_assigned / user_self)
   *
   * Idempotent — re-archiving a skill is a no-op (returns the existing
   * row, no event written, no binding touched).
   */
  async archive(
    skillId: string,
    actorUserId: number,
    actorRole: 'admin' | 'super_admin',
    reason?: string,
  ): Promise<SkillEntity> {
    return this.dataSource.transaction(async (em) => {
      const skill = await em.findOne(SkillEntity, { where: { id: skillId } });
      if (!skill) {
        throw new NotFoundException(`skill ${skillId} not found`);
      }
      if (skill.status === 'archived') {
        return skill;
      }

      await em.save(SkillEntity, { id: skillId, status: 'archived' });

      await em.save(SkillUpdateEventEntity, {
        skillId,
        actorUserId,
        actorRole,
        action: 'archive',
        changelog: reason ?? null,
      });

      // Cascade disable: archive must immediately take the skill out of
      // every user's enabled set so Vibe-side /internal/skills/:id/files
      // stops returning 403 for already-bound users. Plan / admin_assigned
      // rows are kept (audit trail); only flipped to 'disabled'.
      await em
        .createQueryBuilder()
        .update(UserSkillBindingEntity)
        .set({ status: 'disabled' })
        .where('skill_id = :id AND status = :s', {
          id: skillId,
          s: 'enabled',
        })
        .execute();

      return { ...skill, status: 'archived' };
    });
  }

  /**
   * Restore an archived skill to 'published'. Audit + status flip only
   * — bindings are NOT re-enabled (the previous binding rows still
   * exist with status='disabled', so users who had it before can
   * re-enable from "我的 Skill"). Idempotent for already-published;
   * rejects restoring from 'draft' (no such state machine transition).
   */
  async restore(
    skillId: string,
    actorUserId: number,
    actorRole: 'admin' | 'super_admin',
    reason?: string,
  ): Promise<SkillEntity> {
    return this.dataSource.transaction(async (em) => {
      const skill = await em.findOne(SkillEntity, { where: { id: skillId } });
      if (!skill) {
        throw new NotFoundException(`skill ${skillId} not found`);
      }
      if (skill.status === 'draft') {
        throw new BadRequestException(
          `cannot restore skill ${skillId} from draft status`,
        );
      }
      if (skill.status === 'published') {
        return skill;
      }

      await em.save(SkillEntity, { id: skillId, status: 'published' });
      await em.save(SkillUpdateEventEntity, {
        skillId,
        actorUserId,
        actorRole,
        action: 'restore',
        changelog: reason ?? null,
      });

      return { ...skill, status: 'published' };
    });
  }
}
