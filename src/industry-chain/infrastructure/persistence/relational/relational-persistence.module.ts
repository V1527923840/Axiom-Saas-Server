// src/industry-chain/infrastructure/persistence/relational/relational-persistence.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IndustryChainQiniuRegistryEntity } from './entities/industry-chain-qiniu-registry.entity';
import { IndustryChainRepository } from './repositories/industry-chain.repository';
import { IndustryChainRelationalRepository } from './repositories/industry-chain.relational.repository';

@Module({
  imports: [TypeOrmModule.forFeature([IndustryChainQiniuRegistryEntity])],
  providers: [
    {
      provide: IndustryChainRepository,
      useClass: IndustryChainRelationalRepository,
    },
  ],
  exports: [IndustryChainRepository],
})
export class RelationalIndustryChainPersistenceModule {}
