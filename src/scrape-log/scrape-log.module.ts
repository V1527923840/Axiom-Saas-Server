import { Module, forwardRef } from '@nestjs/common';
import { ScrapeLogController } from './scrape-log.controller';
import { ScrapeLogService } from './scrape-log.service';
import { relationalScrapeLogPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';
import { MenusModule } from '../menus/menus.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    relationalScrapeLogPersistenceModule,
    forwardRef(() => MenusModule),
    forwardRef(() => UsersModule),
  ],
  controllers: [ScrapeLogController],
  providers: [ScrapeLogService],
  exports: [ScrapeLogService, relationalScrapeLogPersistenceModule],
})
export class ScrapeLogModule {}
