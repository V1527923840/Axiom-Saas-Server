import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContentCategoryEntity } from '../../../../content/infrastructure/persistence/relational/entities/content-category.entity';
import { ContentItemEntity } from '../../../../content/infrastructure/persistence/relational/entities/content-item.entity';
import { CategoryRepository } from '../category.repository';
import { CategoryRelationalRepository } from './repositories/category.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([ContentCategoryEntity, ContentItemEntity]),
  ],
  providers: [
    {
      provide: CategoryRepository,
      useClass: CategoryRelationalRepository,
    },
  ],
  exports: [CategoryRepository],
})
export class CategoryRelationalPersistenceModule {}
