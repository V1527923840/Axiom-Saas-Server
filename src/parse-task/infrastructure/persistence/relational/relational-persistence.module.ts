import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParseTaskLogsEntity } from './entities/parse-task-logs.entity';
import { ParseTaskLogsRelationalRepository } from './repositories/parse-task-logs.repository';
import { ParseTaskRepository } from '../parse-task.repository';

@Module({
  imports: [TypeOrmModule.forFeature([ParseTaskLogsEntity])],
  providers: [
    {
      provide: ParseTaskRepository,
      useClass: ParseTaskLogsRelationalRepository,
    },
  ],
  exports: [ParseTaskRepository],
})
export class RelationalParseTaskPersistenceModule {}
