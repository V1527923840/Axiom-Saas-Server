import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IntelligenceClassificationEntity } from './entities/intelligence-classification.entity';
import { IntelligenceRepository } from '../intelligence.repository';
import { IntelligenceRelationalRepository } from './repositories/intelligence.repository';

@Module({
  imports: [TypeOrmModule.forFeature([IntelligenceClassificationEntity])],
  providers: [
    {
      provide: IntelligenceRepository,
      useClass: IntelligenceRelationalRepository,
    },
  ],
  exports: [IntelligenceRepository],
})
export class IntelligenceRelationalPersistenceModule {}
