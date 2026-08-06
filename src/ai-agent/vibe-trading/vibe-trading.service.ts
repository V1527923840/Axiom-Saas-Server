import { Injectable } from '@nestjs/common';
import {
  AgentAdapter,
  MessageDto,
  SseChunk,
} from '../interfaces/agent-adapter.interface';
import { VIBE_TRADING_AGENT_TYPE } from './vibe-trading.config';
import { VibeClientService } from './vibe-client.service';

@Injectable()
export class VibeTradingService implements AgentAdapter {
  readonly agentType = VIBE_TRADING_AGENT_TYPE;

  constructor(private readonly client: VibeClientService) {}

  createRemoteSession(ownerId: string) {
    return this.client.createRemoteSession(ownerId);
  }

  sendMessage(
    remoteSessionId: string,
    content: string,
    signal: AbortSignal,
  ): AsyncIterable<SseChunk> {
    return this.client.sendMessage(remoteSessionId, content, signal);
  }

  getMessages(remoteSessionId: string, cursor?: string): Promise<MessageDto[]> {
    return this.client.getMessages(remoteSessionId, cursor);
  }

  cancelRemoteSession(remoteSessionId: string): Promise<void> {
    return this.client.cancelRemoteSession(remoteSessionId);
  }

  deleteRemoteSession(remoteSessionId: string): Promise<void> {
    return this.client.deleteRemoteSession(remoteSessionId);
  }
}
