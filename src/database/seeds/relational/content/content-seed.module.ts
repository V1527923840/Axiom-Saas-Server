import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ContentCategoryEntity } from '../../../../content/infrastructure/persistence/relational/entities/content-category.entity';
import { ContentCategorySeedService } from './content-category/content-category-seed.service';
import { ContentItemEntity } from '../../../../content/infrastructure/persistence/relational/entities/content-item.entity';
import { ContentItemSeedService } from './content-item/content-item-seed.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ContentCategoryEntity]),
    TypeOrmModule.forFeature([ContentItemEntity]),
  ],
  providers: [ContentCategorySeedService, ContentItemSeedService],
  exports: [ContentCategorySeedService, ContentItemSeedService],
})
export class ContentSeedModule {}
