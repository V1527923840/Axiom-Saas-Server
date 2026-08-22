import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SkillRepository } from './infrastructure/persistence/relational/repositories/skill.repository';
import { SkillUpdateEventRepository } from './infrastructure/persistence/relational/repositories/skill-update-event.repository';
import { SkillEntity } from './infrastructure/persistence/relational/entities/skill.entity';

@Injectable()
export class SkillLifecycleService {
  constructor(
    private readonly skillRepo: SkillRepository,
    private readonly eventRepo: SkillUpdateEventRepository,
  ) {}

  async archive(
    skillId: string,
    actorUserId: number,
    actorRole: 'admin' | 'super_admin',
    reason?: string,
  ): Promise<SkillEntity> {
    const skill = await this.skillRepo.findById(skillId);
    if (!skill) {
      throw new NotFoundException(`skill ${skillId} not found`);
    }
    if (skill.status === 'archived') {
      // idempotent
      return skill;
    }
    const updated = await this.skillRepo.update(skillId, {
      status: 'archived',
    });
    await this.eventRepo.create({
      skillId,
      actorUserId,
      actorRole,
      action: 'archive',
      changelog: reason ?? null,
    });
    return { ...skill, ...(updated as object) } as SkillEntity;
  }

  async restore(
    skillId: string,
    actorUserId: number,
    actorRole: 'admin' | 'super_admin',
    reason?: string,
  ): Promise<SkillEntity> {
    const skill = await this.skillRepo.findById(skillId);
    if (!skill) {
      throw new NotFoundException(`skill ${skillId} not found`);
    }
    if (skill.status === 'draft') {
      throw new BadRequestException(
        `cannot restore skill ${skillId} from draft status`,
      );
    }
    if (skill.status === 'published') {
      // idempotent
      return skill;
    }
    const updated = await this.skillRepo.update(skillId, {
      status: 'published',
    });
    await this.eventRepo.create({
      skillId,
      actorUserId,
      actorRole,
      action: 'restore',
      changelog: reason ?? null,
    });
    return { ...skill, ...(updated as object) } as SkillEntity;
  }
}
