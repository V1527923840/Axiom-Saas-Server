export abstract class PlanMenuRepository {
  abstract findByPlanId(planId: string): Promise<{ menuId: string }[]>;

  abstract findByPlanIds(
    planIds: string[],
  ): Promise<{ planId: string; menuId: string }[]>;

  abstract assignMenusToPlan(planId: string, menuIds: string[]): Promise<void>;
}
