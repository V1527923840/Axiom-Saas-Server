import { Module } from '@nestjs/common';
import { ContentModule } from '../content/content.module';
import { DailySummaryController } from './daily-summary.controller';
import { DailySummaryService } from './daily-summary.service';
import { DailySummaryRelationalPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [DailySummaryRelationalPersistenceModule, ContentModule],
  controllers: [DailySummaryController],
  providers: [DailySummaryService],
  exports: [DailySummaryService],
})
export class DailySummaryModule {}
