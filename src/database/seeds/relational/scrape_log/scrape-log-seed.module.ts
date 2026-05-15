import { Module } from '@nestjs/common';
import { ScrapeLogSeedService } from './scrape-log-seed.service';

@Module({
  providers: [ScrapeLogSeedService],
})
export class ScrapeLogSeedModule {}
