import { Module } from '@nestjs/common';
import { BillsController } from './bills.controller';
import { BillsService } from './bills.service';
import { ConsumptionsService } from './consumptions.service';
import { RelationalBillsPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';
import databaseConfig from '../database/config/database.config';
import { DatabaseConfig } from '../database/config/database-config.type';

const infrastructurePersistenceModule = (databaseConfig() as DatabaseConfig)
  .isDocumentDatabase
  ? RelationalBillsPersistenceModule
  : RelationalBillsPersistenceModule;

@Module({
  imports: [infrastructurePersistenceModule],
  controllers: [BillsController],
  providers: [BillsService, ConsumptionsService],
  exports: [BillsService, ConsumptionsService, infrastructurePersistenceModule],
})
export class BillsModule {}
