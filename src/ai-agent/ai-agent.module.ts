import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { AiAgentController } from './ai-agent.controller';
import { AiAgentService } from './ai-agent.service';
import { AgentAdapterRegistry } from './infrastructure/agent-adapter.registry';
import { ConcurrencyService } from './infrastructure/concurrency/concurrency.service';
import { QuotaService } from './infrastructure/quota/quota.service';
import { SessionCleanupService } from './infrastructure/cleanup/session-cleanup.service';
import { RelationalAiSessionPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';
import { VibeTradingModule } from './vibe-trading/vibe-trading.module';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    RelationalAiSessionPersistenceModule,
    VibeTradingModule,
    MulterModule.register({
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  ],
  controllers: [AiAgentController],
  providers: [
    AiAgentService,
    AgentAdapterRegistry,
    QuotaService,
    ConcurrencyService,
    SessionCleanupService,
  ],
  exports: [AiAgentService],
})
export class AiAgentModule {}
