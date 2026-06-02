import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResearchAnalysisEntity } from './entities/research-analysis.entity';
import { ResearchRelationalRepository } from './repositories/research.repository';
import { ResearchRepository } from '../research.repository';
import { ResearchAnalysisMapper } from './mappers/research-analysis.mapper';

@Module({
  imports: [TypeOrmModule.forFeature([ResearchAnalysisEntity])],
  providers: [
    {
      provide: ResearchRepository,
      useClass: ResearchRelationalRepository,
    },
    ResearchAnalysisMapper,
  ],
  exports: [ResearchRepository, TypeOrmModule],
})
export class ResearchRelationalPersistenceModule {}
