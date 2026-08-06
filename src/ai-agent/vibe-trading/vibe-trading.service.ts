import { Injectable } from '@nestjs/common';
import {
  AgentAdapter,
  AgentStreamEvent,
  MessageDto,
} from '../interfaces/agent-adapter.interface';
import { VIBE_TRADING_AGENT_TYPE } from './vibe-trading.config';
import { VibeClientService } from './vibe-client.service';

@Injectable()
export class VibeTradingService implements AgentAdapter {
  readonly agentType = VIBE_TRADING_AGENT_TYPE;

  constructor(private readonly client: VibeClientService) {}

  createRemoteSession() {
    return this.client.createRemoteSession();
  }

  submitMessage(
    remoteSessionId: string,
    content: string,
    signal: AbortSignal,
  ): Promise<{ messageId: string; attemptId: string }> {
    return this.client.submitMessage(remoteSessionId, content, signal);
  }

  async *streamEvents(
    remoteSessionId: string,
    signal: AbortSignal,
  ): AsyncGenerator<AgentStreamEvent> {
    yield* this.client.streamEvents(remoteSessionId, signal);
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
