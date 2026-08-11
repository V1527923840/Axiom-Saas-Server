import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ZsxqPostEntity } from './entities/zsxq-post.entity';
import { ZsxqPostRepository } from '../zsxq-post.repository';
import { ZsxqPostRelationalRepository } from './repositories/zsxq-post.repository';

@Module({
  imports: [TypeOrmModule.forFeature([ZsxqPostEntity])],
  providers: [
    {
      provide: ZsxqPostRepository,
      useClass: ZsxqPostRelationalRepository,
    },
  ],
  exports: [ZsxqPostRepository],
})
export class ZsxqPostRelationalPersistenceModule {}
