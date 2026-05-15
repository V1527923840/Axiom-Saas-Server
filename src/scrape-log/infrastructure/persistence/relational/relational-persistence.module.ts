import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScrapeLogEntity } from './entities/scrape-log.entity';
import { ScrapeLogRelationalRepository } from './repositories/scrape-log.repository';
import { ScrapeLogRepository } from '../scrape-log.repository';

@Module({
  imports: [TypeOrmModule.forFeature([ScrapeLogEntity])],
  providers: [
    {
      provide: ScrapeLogRepository,
      useClass: ScrapeLogRelationalRepository,
    },
  ],
  exports: [ScrapeLogRepository],
})
export class relationalScrapeLogPersistenceModule {}
