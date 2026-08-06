export interface MessageDto {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  createdAt: Date;
  meta?: Record<string, unknown>;
}

export interface AgentAdapter {
  readonly agentType: string;

  createRemoteSession(): Promise<{
    remoteSessionId: string;
    meta?: Record<string, unknown>;
  }>;

  /**
   * 同步提交一条消息，返回上游分配的 message_id 与 attempt_id。
   * 真正的流式输出通过 streamEvents() 走独立 SSE 通道。
   */
  submitMessage(
    remoteSessionId: string,
    content: string,
    signal: AbortSignal,
  ): Promise<{ messageId: string; attemptId: string }>;

  getMessages(remoteSessionId: string, cursor?: string): Promise<MessageDto[]>;

  cancelRemoteSession(remoteSessionId: string): Promise<void>;

  deleteRemoteSession(remoteSessionId: string): Promise<void>;
}

export const AGENT_ADAPTERS = Symbol('AGENT_ADAPTERS');
