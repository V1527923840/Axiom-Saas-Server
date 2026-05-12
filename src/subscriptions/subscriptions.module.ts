import { Module } from '@nestjs/common';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { DocumentSubscriptionPersistenceModule } from './infrastructure/persistence/document/document-persistence.module';
import { RelationalSubscriptionPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';
import { DatabaseConfig } from '../database/config/database-config.type';
import databaseConfig from '../database/config/database.config';
import { PlansModule } from '../plans/plans.module';
import { UsersModule } from '../users/users.module';

// <database-block>
const infrastructurePersistenceModule = (databaseConfig() as DatabaseConfig)
  .isDocumentDatabase
  ? DocumentSubscriptionPersistenceModule
  : RelationalSubscriptionPersistenceModule;
// </database-block>

@Module({
  imports: [infrastructurePersistenceModule, PlansModule, UsersModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService, infrastructurePersistenceModule],
})
export class SubscriptionsModule {}
