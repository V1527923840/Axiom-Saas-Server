import { Module, forwardRef } from '@nestjs/common';
import { ParseTaskController } from './parse-tasks';
import { ParseTaskService } from './parse-task.service';
import { RelationalParseTaskPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';
import { ScrapeLogModule } from '../scrape-log/scrape-log.module';
import { OssModule } from '../oss/oss.module';
import { MenusModule } from '../menus/menus.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    RelationalParseTaskPersistenceModule,
    forwardRef(() => ScrapeLogModule),
    OssModule,
    forwardRef(() => MenusModule),
    forwardRef(() => UsersModule),
  ],
  controllers: [ParseTaskController],
  providers: [ParseTaskService],
  exports: [ParseTaskService, RelationalParseTaskPersistenceModule],
})
export class ParseTaskModule {}
