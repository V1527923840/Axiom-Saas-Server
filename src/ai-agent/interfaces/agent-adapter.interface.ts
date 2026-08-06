export interface MessageDto {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  createdAt: Date;
  meta?: Record<string, unknown>;
}

export type SseChunkType = 'message' | 'tool' | 'done' | 'error';

export interface SseChunk {
  type: SseChunkType;
  data: Record<string, unknown>;
}

export interface AgentAdapter {
  readonly agentType: string;

  createRemoteSession(): Promise<{
    remoteSessionId: string;
    meta?: Record<string, unknown>;
  }>;

  sendMessage(
    remoteSessionId: string,
    content: string,
    signal: AbortSignal,
  ): AsyncIterable<SseChunk>;

  getMessages(remoteSessionId: string, cursor?: string): Promise<MessageDto[]>;

  cancelRemoteSession(remoteSessionId: string): Promise<void>;

  deleteRemoteSession(remoteSessionId: string): Promise<void>;
}

export const AGENT_ADAPTERS = Symbol('AGENT_ADAPTERS');
