import { Module } from '@nestjs/common';
import { IntelligenceController } from './intelligence.controller';
import { IntelligenceService } from './intelligence.service';
import { IntelligenceRelationalPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [IntelligenceRelationalPersistenceModule],
  controllers: [IntelligenceController],
  providers: [IntelligenceService],
  exports: [IntelligenceService],
})
export class IntelligenceModule {}
