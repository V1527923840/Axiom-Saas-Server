import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DailySummaryEntity } from './entities/daily-summary.entity';
import { DailySummaryRepository } from '../daily-summary.repository';
import { DailySummaryRelationalRepository } from './repositories/daily-summary.repository';

@Module({
  imports: [TypeOrmModule.forFeature([DailySummaryEntity])],
  providers: [
    {
      provide: DailySummaryRepository,
      useClass: DailySummaryRelationalRepository,
    },
  ],
  exports: [DailySummaryRepository],
})
export class DailySummaryRelationalPersistenceModule {}
