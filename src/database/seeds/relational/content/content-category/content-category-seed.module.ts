import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ContentCategoryEntity } from '../../../../../content/infrastructure/persistence/relational/entities/content-category.entity';
import { ContentCategorySeedService } from './content-category-seed.service';

@Module({
  imports: [TypeOrmModule.forFeature([ContentCategoryEntity])],
  providers: [ContentCategorySeedService],
  exports: [ContentCategorySeedService],
})
export class ContentCategorySeedModule {}
