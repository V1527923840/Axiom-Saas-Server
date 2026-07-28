// src/industry-chain/industry-chain.module.ts
import { Module } from '@nestjs/common';
import { IndustryChainController } from './industry-chain.controller';
import { IndustryChainService } from './industry-chain.service';
import { RelationalIndustryChainPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';
import { MenusModule } from '../menus/menus.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [RelationalIndustryChainPersistenceModule, MenusModule, UsersModule],
  controllers: [IndustryChainController],
  providers: [IndustryChainService],
  exports: [IndustryChainService, RelationalIndustryChainPersistenceModule],
})
export class IndustryChainModule {}
