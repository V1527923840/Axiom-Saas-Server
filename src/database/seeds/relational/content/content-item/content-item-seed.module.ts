import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ContentItemEntity } from '../../../../../content/infrastructure/persistence/relational/entities/content-item.entity';
import { ContentItemSeedService } from './content-item-seed.service';

@Module({
  imports: [TypeOrmModule.forFeature([ContentItemEntity])],
  providers: [ContentItemSeedService],
  exports: [ContentItemSeedService],
})
export class ContentItemSeedModule {}
