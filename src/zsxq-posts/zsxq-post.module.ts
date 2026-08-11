import { Module } from '@nestjs/common';
import { ZsxqPostRelationalPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';
import { ZsxqPostService } from './zsxq-post.service';

@Module({
  imports: [ZsxqPostRelationalPersistenceModule],
  providers: [ZsxqPostService],
  exports: [ZsxqPostService],
})
export class ZsxqPostModule {}
