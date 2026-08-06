import { AiSession } from '../domain/ai-session';

export class SessionResponseDto {
  static fromDomain(s: AiSession) {
    return {
      id: s.id,
      agentType: s.agentType,
      remoteSessionId: s.remoteSessionId,
      title: s.title,
      status: s.status,
      lastActiveAt: s.lastActiveAt,
      expiresAt: s.expiresAt,
      createdAt: s.createdAt,
    };
  }
}
