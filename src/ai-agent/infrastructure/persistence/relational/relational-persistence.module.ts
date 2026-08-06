import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiSessionEntity } from './entities/ai-session.entity';
import { AiSessionRepository } from '../ai-session.repository';
import { RelationalAiSessionRepository } from './repositories/ai-session.repository';

@Module({
  imports: [TypeOrmModule.forFeature([AiSessionEntity])],
  providers: [
    {
      provide: AiSessionRepository,
      useClass: RelationalAiSessionRepository,
    },
  ],
  exports: [AiSessionRepository],
})
export class RelationalAiSessionPersistenceModule {}
