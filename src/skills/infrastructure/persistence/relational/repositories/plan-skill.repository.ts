import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlanSkillEntity } from '../entities/plan-skill.entity';

/**
 * Skill Plaza — PlanSkill repository.
 *
 * Associates skills with subscription plans so that subscribing to
 * a plan auto-enables the user_skill_binding rows. planId is uuid
 * (plan.id is uuid per migration Task 3).
 */
@Injectable()
export class PlanSkillRepository {
  constructor(
    @InjectRepository(PlanSkillEntity)
    private readonly repository: Repository<PlanSkillEntity>,
  ) {}

  findByPlan(planId: string): Promise<PlanSkillEntity[]> {
    return this.repository.find({ where: { planId } });
  }

  findEnabledByPlan(planId: string): Promise<PlanSkillEntity[]> {
    return this.repository.find({
      where: { planId, enabled: true },
    });
  }

  async isInPlan(planId: string, skillId: string): Promise<boolean> {
    const count = await this.repository.count({
      where: { planId, skillId },
    });
    return count > 0;
  }

  async create(input: Partial<PlanSkillEntity>): Promise<PlanSkillEntity> {
    const entity = this.repository.create(input);
    return this.repository.save(entity);
  }

  async remove(planId: string, skillId: string): Promise<void> {
    await this.repository.delete({ planId, skillId });
  }
}
