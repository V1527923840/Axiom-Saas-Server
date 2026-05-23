import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EtlController } from './etl.controller';
import { EtlService } from './etl.service';
import { EtlProcessor } from './etl.processor';
import { EtlJobEntity } from './infrastructure/persistence/relational/entities/etl-job.entity';
import { DocumentClassificationEntity } from './infrastructure/persistence/relational/entities/document-classification.entity';
import { ContentItemEntity } from '../content/infrastructure/persistence/relational/entities/content-item.entity';
import { ContentCategoryEntity } from '../content/infrastructure/persistence/relational/entities/content-category.entity';
import { EtlJobRepository } from './infrastructure/persistence/etl-job.repository';
import { EtlJobRelationalRepository } from './infrastructure/persistence/relational/repositories/etl-job.repository';
import { MenusModule } from '../menus/menus.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EtlJobEntity,
      DocumentClassificationEntity,
      ContentItemEntity,
      ContentCategoryEntity,
    ]),
    MenusModule,
    UsersModule,
  ],
  controllers: [EtlController],
  providers: [
    EtlService,
    EtlProcessor,
    {
      provide: EtlJobRepository,
      useClass: EtlJobRelationalRepository,
    },
  ],
  exports: [EtlService, EtlProcessor],
})
export class EtlModule {}
