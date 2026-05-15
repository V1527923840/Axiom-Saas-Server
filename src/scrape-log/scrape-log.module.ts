import { Module } from '@nestjs/common';
import { ScrapeLogController } from './scrape-log.controller';
import { ScrapeLogService } from './scrape-log.service';
import { relationalScrapeLogPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [relationalScrapeLogPersistenceModule],
  controllers: [ScrapeLogController],
  providers: [ScrapeLogService],
  exports: [ScrapeLogService, relationalScrapeLogPersistenceModule],
})
export class ScrapeLogModule {}
