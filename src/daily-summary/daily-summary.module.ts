import { Module } from '@nestjs/common';
import { ResearchModule } from '../research/research.module';
import { ZsxqPostModule } from '../zsxq-posts/zsxq-post.module';
import { DailySummaryController } from './daily-summary.controller';
import { DailySummaryService } from './daily-summary.service';
import { DailySummaryRelationalPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    DailySummaryRelationalPersistenceModule,
    // Required by DailySummaryService.getSources. The Agent-pipeline
    // tables these reference are NOT content_item — `source_post_ids`
    // point at zsxq_posts (uuid) and `source_research_ids` point at
    // research_analysis (integer). Earlier code path used
    // ContentService which crashed when numeric ids landed in the uuid
    // IN query, so each source type now hits its own table.
    ZsxqPostModule,
    ResearchModule,
  ],
  controllers: [DailySummaryController],
  providers: [DailySummaryService],
  exports: [DailySummaryService],
})
export class DailySummaryModule {}
