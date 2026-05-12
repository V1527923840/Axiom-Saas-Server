import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentFlowEntity } from './entities/payment-flow.entity';
import { ConsumptionEntity } from './entities/consumption.entity';
import { PaymentFlowRepository } from '../payment-flow.repository';
import { ConsumptionRepository } from '../consumption.repository';
import { PaymentFlowRelationalRepository } from './repositories/payment-flow.repository';
import { ConsumptionRelationalRepository } from './repositories/consumption.repository';

@Module({
  imports: [TypeOrmModule.forFeature([PaymentFlowEntity, ConsumptionEntity])],
  providers: [
    {
      provide: PaymentFlowRepository,
      useClass: PaymentFlowRelationalRepository,
    },
    {
      provide: ConsumptionRepository,
      useClass: ConsumptionRelationalRepository,
    },
  ],
  exports: [PaymentFlowRepository, ConsumptionRepository],
})
export class RelationalBillsPersistenceModule {}
