import { Module } from '@nestjs/common';
import { VibeClientService } from './vibe-client.service';
import { VibeTradingService } from './vibe-trading.service';
import { AGENT_ADAPTERS } from '../interfaces/agent-adapter.interface';

@Module({
  providers: [
    VibeClientService,
    VibeTradingService,
    {
      provide: AGENT_ADAPTERS,
      useFactory: (vibe: VibeTradingService) => [vibe],
      inject: [VibeTradingService],
    },
  ],
  exports: [VibeClientService, VibeTradingService, AGENT_ADAPTERS],
})
export class VibeTradingModule {}
