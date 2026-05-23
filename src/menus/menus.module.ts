import { Module, forwardRef } from '@nestjs/common';
import { MenusController } from './menus.controller';
import { MenusService } from './menus.service';
import { MenuAccessGuard } from './menu-access.guard';
import { RelationalMenuPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';
import databaseConfig from '../database/config/database.config';
import { DatabaseConfig } from '../database/config/database-config.type';
import { PlansModule } from '../plans/plans.module';
import { UsersModule } from '../users/users.module';

const infrastructurePersistenceModule = (databaseConfig() as DatabaseConfig)
  .isDocumentDatabase
  ? RelationalMenuPersistenceModule
  : RelationalMenuPersistenceModule;

@Module({
  imports: [
    infrastructurePersistenceModule,
    forwardRef(() => PlansModule),
    forwardRef(() => UsersModule),
  ],
  controllers: [MenusController],
  providers: [MenusService, MenuAccessGuard],
  exports: [MenusService, MenuAccessGuard, infrastructurePersistenceModule],
})
export class MenusModule {}
