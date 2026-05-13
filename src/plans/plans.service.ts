import { Injectable, NotFoundException } from '@nestjs/common';
import { CreatePlanDto } from './dto/create-plan.dto';
import { NullableType } from '../utils/types/nullable.type';
import { FilterPlanDto, SortPlanDto } from './dto/query-plan.dto';
import { PlanRepository } from './infrastructure/persistence/plan.repository';
import { PlanMenuRepository } from './infrastructure/persistence/plan-menu.repository';
import { MenuRepository } from '../menus/infrastructure/persistence/menu.repository';
import { Plan } from './domain/plan';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { Menu } from '../menus/domain/menu';

@Injectable()
export class PlansService {
  constructor(
    private readonly plansRepository: PlanRepository,
    private readonly planMenuRepository: PlanMenuRepository,
    private readonly menuRepository: MenuRepository,
  ) {}

  async create(createPlanDto: CreatePlanDto): Promise<Plan> {
    return this.plansRepository.create({
      name: createPlanDto.name,
      tier: createPlanDto.tier,
      cycle: createPlanDto.cycle,
      pointsQuota: createPlanDto.pointsQuota,
      chatQuota: createPlanDto.chatQuota,
      price: createPlanDto.price,
      promotionalPrice: createPlanDto.promotionalPrice,
      description: createPlanDto.description,
      status: createPlanDto.status ?? 'active',
    } as Omit<Plan, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>);
  }

  findManyWithPagination({
    filterOptions,
    sortOptions,
    paginationOptions,
  }: {
    filterOptions?: FilterPlanDto | null;
    sortOptions?: SortPlanDto[] | null;
    paginationOptions: IPaginationOptions;
  }) {
    return this.plansRepository.findManyWithPagination({
      filterOptions,
      sortOptions,
      paginationOptions,
    });
  }

  findById(id: Plan['id']): Promise<NullableType<Plan>> {
    return this.plansRepository.findById(id);
  }

  findByIds(ids: Plan['id'][]): Promise<Plan[]> {
    return this.plansRepository.findByIds(ids);
  }

  async update(
    id: Plan['id'],
    updatePlanDto: UpdatePlanDto,
  ): Promise<Plan | null> {
    return this.plansRepository.update(id, updatePlanDto);
  }

  async remove(id: Plan['id']): Promise<void> {
    await this.plansRepository.remove(id);
  }

  async assignMenusToPlan(planId: string, menuIds: string[]): Promise<void> {
    const plan = await this.plansRepository.findById(planId);
    if (!plan) {
      throw new NotFoundException('Plan not found');
    }
    await this.planMenuRepository.assignMenusToPlan(planId, menuIds);
  }

  async getPlanMenus(planId: string): Promise<Menu[]> {
    const planMenus = await this.planMenuRepository.findByPlanId(planId);
    if (planMenus.length === 0) {
      return [];
    }
    const menuIds = planMenus.map((pm) => pm.menuId);
    const menus = await this.menuRepository.findByIds(menuIds);
    return this.buildMenuTree(menus);
  }

  private buildMenuTree(menus: Menu[]): Menu[] {
    const menuMap = new Map<string, Menu>();
    const roots: Menu[] = [];

    menus.forEach((menu) => {
      menuMap.set(menu.id, { ...menu, children: [] });
    });

    menus.forEach((menu) => {
      const domainMenu = menuMap.get(menu.id)!;
      if (menu.parentId && menuMap.has(menu.parentId)) {
        const parent = menuMap.get(menu.parentId)!;
        parent.children!.push(domainMenu);
      } else {
        roots.push(domainMenu);
      }
    });

    return roots;
  }

  async getAllMenusForPlan(planId: string): Promise<Menu[]> {
    // For now, plan menus are just from plan_menu table
    // In the future, this could aggregate from role menus if plans inherit from roles
    return this.getPlanMenus(planId);
  }
}
