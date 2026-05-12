import { Module } from '@nestjs/common';
import { MenusController } from './menus.controller';
import { MenusService } from './menus.service';
import { RelationalMenuPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';
import databaseConfig from '../database/config/database.config';
import { DatabaseConfig } from '../database/config/database-config.type';

const infrastructurePersistenceModule = (databaseConfig() as DatabaseConfig)
  .isDocumentDatabase
  ? RelationalMenuPersistenceModule
  : RelationalMenuPersistenceModule;

@Module({
  imports: [infrastructurePersistenceModule],
  controllers: [MenusController],
  providers: [MenusService],
  exports: [MenusService, infrastructurePersistenceModule],
})
export class MenusModule {}
