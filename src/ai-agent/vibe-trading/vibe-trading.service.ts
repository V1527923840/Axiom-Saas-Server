import { Injectable } from '@nestjs/common';
import {
  AgentAdapter,
  AgentStreamEvent,
  MessageDto,
  SkillRef,
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
    skills: SkillRef[],
    userId: number | string,
  ): Promise<{ messageId: string; attemptId: string }> {
    // ★ Skill Plaza: forward resolved skills to VibeTrading so it can inject
    // the 5 LoadSkill*Tool into the agent ToolRegistry on each attempt.
    // ★ User-scope: forward userId so the vibe upstream can apply per-user
    // skill injection on this attempt.
    return this.client.submitMessage(
      remoteSessionId,
      content,
      signal,
      skills,
      userId,
    );
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
