import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { AiAgentController } from './ai-agent.controller';
import { AiAgentService } from './ai-agent.service';
import { AgentAdapterRegistry } from './infrastructure/agent-adapter.registry';
import { ConcurrencyService } from './infrastructure/concurrency/concurrency.service';
import { QuotaService } from './infrastructure/quota/quota.service';
import { SessionCleanupService } from './infrastructure/cleanup/session-cleanup.service';

@Module({
  imports: [AuthModule, UsersModule],
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
