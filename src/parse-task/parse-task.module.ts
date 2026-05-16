import { Module, forwardRef } from '@nestjs/common';
import { ParseTaskController, VersionController } from './parse-tasks';
import { ParseTaskService } from './parse-task.service';
import { VersionService } from '../services/version-service';
import { RelationalParseTaskPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';
import { ScrapeLogModule } from '../scrape-log/scrape-log.module';
import { OssModule } from '../oss/oss.module';

@Module({
  imports: [
    RelationalParseTaskPersistenceModule,
    forwardRef(() => ScrapeLogModule),
    OssModule,
  ],
  controllers: [ParseTaskController, VersionController],
  providers: [ParseTaskService, VersionService],
  exports: [ParseTaskService, RelationalParseTaskPersistenceModule],
})
export class ParseTaskModule {}
