import { Module } from '@nestjs/common';
import { PlanRepository } from '../plan.repository';
import { PlansRelationalRepository } from './repositories/plan.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlanEntity } from './entities/plan.entity';
import { PlanMenuEntity } from './entities/plan-menu.entity';
import { PlanMenuRepository } from '../plan-menu.repository';
import { PlanMenuRelationalRepository } from './repositories/plan-menu.repository';

@Module({
  imports: [TypeOrmModule.forFeature([PlanEntity, PlanMenuEntity])],
  providers: [
    {
      provide: PlanRepository,
      useClass: PlansRelationalRepository,
    },
    {
      provide: PlanMenuRepository,
      useClass: PlanMenuRelationalRepository,
    },
  ],
  exports: [PlanRepository, PlanMenuRepository],
})
export class RelationalPlanPersistenceModule {}
