export interface MessageDto {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  createdAt: Date;
  meta?: Record<string, unknown>;
}

/**
 * SSE 事件流的统一形状：上游推送的 event 名称 + data 负载（任意 JSON）。
 */
export interface AgentStreamEvent {
  event: string;
  data: Record<string, unknown>;
}

/**
 * Skill reference shape forwarded to upstream VibeTrading per spec §3.5.1.
 * Unversioned — ID-only contract (upload overwrites).
 *
 * ★ 2026-08-20 augmentation: also forward `code` and `name` so VibeTrading's
 *   register_skill_tools can build an `allowed_ids` set that accepts any of
 *   {id, code, name} as a load_skill_* tool argument. The LLM is told the
 *   full UUID in the system prompt but may still call tools with the more
 *   readable code/name; without this, the guard rejects the call as
 *   "not in current request's requested_skills" even though the binding
 *   is valid.
 */
export interface SkillRef {
  id: string;
  code?: string;
  name?: string;
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
   *
   * @param skills ★ Skill Plaza — resolved skill IDs from SkillResolverService,
   *               already merged user baseline + session mount delta.
   *               Empty array means "no skills attached this turn" (zero
   *               intrusion for sessions that don't use Skill Plaza).
   * @param userId ★ User-scope — Saas-side user id (number | string).
   *               Forwarded to the vibe upstream so it can inject
   *               user-scoped skills into the agent ToolRegistry per turn
   *               (the "skill_resolver._saas_user_id" header/body contract).
   */
  submitMessage(
    remoteSessionId: string,
    content: string,
    signal: AbortSignal,
    skills: SkillRef[],
    userId: number | string,
  ): Promise<{ messageId: string; attemptId: string }>;

  /**
   * 长连接订阅一个 session 的事件流。返回 AsyncGenerator，调用方负责消费与中止。
   */
  streamEvents(
    remoteSessionId: string,
    signal: AbortSignal,
  ): AsyncGenerator<AgentStreamEvent>;

  getMessages(remoteSessionId: string, cursor?: string): Promise<MessageDto[]>;

  cancelRemoteSession(remoteSessionId: string): Promise<void>;

  deleteRemoteSession(remoteSessionId: string): Promise<void>;
}

export const AGENT_ADAPTERS = Symbol('AGENT_ADAPTERS');
