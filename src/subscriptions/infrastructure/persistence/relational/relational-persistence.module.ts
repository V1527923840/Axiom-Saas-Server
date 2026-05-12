import { Module } from '@nestjs/common';
import { SubscriptionRepository } from '../subscription.repository';
import { SubscriptionsRelationalRepository } from './repositories/subscription.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionEntity } from './entities/subscription.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SubscriptionEntity])],
  providers: [
    {
      provide: SubscriptionRepository,
      useClass: SubscriptionsRelationalRepository,
    },
  ],
  exports: [SubscriptionRepository],
})
export class RelationalSubscriptionPersistenceModule {}
