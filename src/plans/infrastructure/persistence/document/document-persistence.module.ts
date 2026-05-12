import { Module } from '@nestjs/common';
import { PlanRepository } from '../plan.repository';
import { PlansDocumentRepository } from './repositories/plan.repository';
import { MongooseModule } from '@nestjs/mongoose';
import { PlanSchema, PlanSchemaClass } from './entities/plan.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PlanSchemaClass.name, schema: PlanSchema },
    ]),
  ],
  providers: [
    {
      provide: PlanRepository,
      useClass: PlansDocumentRepository,
    },
  ],
  exports: [PlanRepository],
})
export class DocumentPlanPersistenceModule {}
