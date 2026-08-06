import { Inject, Injectable } from '@nestjs/common';
import {
  AgentAdapter,
  AGENT_ADAPTERS,
} from '../interfaces/agent-adapter.interface';

@Injectable()
export class AgentAdapterRegistry {
  private readonly map: Map<string, AgentAdapter>;

  constructor(@Inject(AGENT_ADAPTERS) adapters: AgentAdapter[]) {
    this.map = new Map(adapters.map((a) => [a.agentType, a]));
  }

  listAgentTypes(): string[] {
    return [...this.map.keys()];
  }

  get(agentType: string): AgentAdapter {
    const adapter = this.map.get(agentType);
    if (!adapter) {
      throw new Error(`unknown agent type: ${agentType}`);
    }
    return adapter;
  }
}
