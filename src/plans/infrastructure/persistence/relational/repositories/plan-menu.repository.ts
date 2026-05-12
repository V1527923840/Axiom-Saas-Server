import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository, In } from 'typeorm';
import { PlanMenuEntity } from '../entities/plan-menu.entity';
import { PlanMenuRepository } from '../../plan-menu.repository';

@Injectable()
export class PlanMenuRelationalRepository implements PlanMenuRepository {
  constructor(
    @InjectRepository(PlanMenuEntity)
    private readonly planMenuRepository: Repository<PlanMenuEntity>,
  ) {}

  async findByPlanId(planId: string): Promise<{ menuId: string }[]> {
    const entities = await this.planMenuRepository.find({
      where: { planId },
      select: ['menuId'],
    });
    return entities.map((e) => ({ menuId: e.menuId }));
  }

  async findByPlanIds(
    planIds: string[],
  ): Promise<{ planId: string; menuId: string }[]> {
    if (planIds.length === 0) {
      return [];
    }
    const entities = await this.planMenuRepository.find({
      where: { planId: In(planIds) },
      select: ['planId', 'menuId'],
    });
    return entities.map((e) => ({ planId: e.planId, menuId: e.menuId }));
  }

  async assignMenusToPlan(planId: string, menuIds: string[]): Promise<void> {
    // Delete existing plan-menu associations
    await this.planMenuRepository.delete({ planId });

    // Create new associations
    if (menuIds.length > 0) {
      const planMenus = menuIds.map((menuId) => {
        const planMenu = new PlanMenuEntity();
        planMenu.planId = planId;
        planMenu.menuId = menuId;
        return planMenu;
      });

      await this.planMenuRepository.save(planMenus);
    }
  }
}
