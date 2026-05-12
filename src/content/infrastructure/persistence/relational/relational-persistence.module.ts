import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContentCategoryEntity } from './entities/content-category.entity';
import { ContentItemEntity } from './entities/content-item.entity';
import { ContentCategoryRepository } from '../content-category.repository';
import { ContentItemRepository } from '../content-item.repository';
import { ContentCategoryRelationalRepository } from './repositories/content-category.repository';
import { ContentItemRelationalRepository } from './repositories/content-item.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([ContentCategoryEntity, ContentItemEntity]),
  ],
  providers: [
    {
      provide: ContentCategoryRepository,
      useClass: ContentCategoryRelationalRepository,
    },
    {
      provide: ContentItemRepository,
      useClass: ContentItemRelationalRepository,
    },
  ],
  exports: [ContentCategoryRepository, ContentItemRepository],
})
export class ContentRelationalPersistenceModule {}
