import { Module, forwardRef } from '@nestjs/common';
import { PlansController } from './plans.controller';
import { PlansService } from './plans.service';
import { DocumentPlanPersistenceModule } from './infrastructure/persistence/document/document-persistence.module';
import { RelationalPlanPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';
import { DatabaseConfig } from '../database/config/database-config.type';
import databaseConfig from '../database/config/database.config';
import { MenusModule } from '../menus/menus.module';

// <database-block>
const infrastructurePersistenceModule = (databaseConfig() as DatabaseConfig)
  .isDocumentDatabase
  ? DocumentPlanPersistenceModule
  : RelationalPlanPersistenceModule;
// </database-block>

@Module({
  imports: [infrastructurePersistenceModule, forwardRef(() => MenusModule)],
  controllers: [PlansController],
  providers: [PlansService],
  exports: [PlansService, infrastructurePersistenceModule],
})
export class PlansModule {}
