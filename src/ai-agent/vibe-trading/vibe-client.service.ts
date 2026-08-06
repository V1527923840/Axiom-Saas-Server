import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AllConfigType } from '../../config/config.type';
import { MessageDto, SseChunk } from '../interfaces/agent-adapter.interface';

@Injectable()
export class VibeClientService {
  private readonly logger = new Logger(VibeClientService.name);

  constructor(private readonly configService: ConfigService<AllConfigType>) {}

  private baseUrl() {
    return this.configService.get('vibeTrading.baseUrl', { infer: true });
  }

  private authHeaders(
    extra: Record<string, string> = {},
  ): Record<string, string> {
    const token = this.configService.get('vibeTrading.apiToken', {
      infer: true,
    });
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...extra,
    };
  }

  private timeoutSignal(): AbortSignal {
    const ms =
      this.configService.get('vibeTrading.timeoutMs', { infer: true }) ?? 60000;
    return AbortSignal.timeout(ms);
  }

  async createRemoteSession(): Promise<{ remoteSessionId: string }> {
    const res = await fetch(`${this.baseUrl()}/sessions`, {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify({ title: '' }),
      signal: this.timeoutSignal(),
    });
    if (!res.ok) {
      throw new HttpException(
        {
          statusCode: HttpStatus.BAD_GATEWAY,
          message: `Vibe create session failed: ${res.status}`,
        },
        HttpStatus.BAD_GATEWAY,
      );
    }
    const data = (await res.json()) as { session_id: string };
    return { remoteSessionId: data.session_id };
  }

  /**
   * 同步提交一条消息给上游 Vibe Trading。
   * 上游 POST /sessions/{remoteSessionId}/messages 同步返回 {message_id, attempt_id}，
   * 真正的流式输出走 GET /sessions/{remoteSessionId}/events（见 streamEvents）。
   */
  async submitMessage(
    remoteSessionId: string,
    content: string,
    signal: AbortSignal,
  ): Promise<{ messageId: string; attemptId: string }> {
    const res = await fetch(
      `${this.baseUrl()}/sessions/${remoteSessionId}/messages`,
      {
        method: 'POST',
        headers: this.authHeaders(),
        body: JSON.stringify({ content }),
        signal,
      },
    );
    if (!res.ok) {
      throw new HttpException(
        {
          statusCode: HttpStatus.BAD_GATEWAY,
          message: `Vibe submit message failed: ${res.status}`,
        },
        HttpStatus.BAD_GATEWAY,
      );
    }
    const data = (await res.json()) as {
      message_id: string;
      attempt_id: string;
    };
    return { messageId: data.message_id, attemptId: data.attempt_id };
  }

  async getMessages(
    remoteSessionId: string,
    cursor?: string,
  ): Promise<MessageDto[]> {
    const url = new URL(
      `${this.baseUrl()}/sessions/${remoteSessionId}/messages`,
    );
    if (cursor) url.searchParams.set('cursor', cursor);
    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: this.authHeaders(),
      signal: this.timeoutSignal(),
    });
    if (!res.ok) {
      throw new HttpException(
        {
          statusCode: HttpStatus.BAD_GATEWAY,
          message: `Vibe get messages failed: ${res.status}`,
        },
        HttpStatus.BAD_GATEWAY,
      );
    }
    const data = (await res.json()) as any[];
    return (Array.isArray(data) ? data : []).map((m) => ({
      id: m.message_id ?? m.id,
      role: m.role,
      content: m.content,
      createdAt: new Date(m.created_at ?? Date.now()),
      meta: m.metadata ?? m.meta,
    }));
  }

  async cancelRemoteSession(remoteSessionId: string): Promise<void> {
    await fetch(`${this.baseUrl()}/sessions/${remoteSessionId}/cancel`, {
      method: 'POST',
      headers: this.authHeaders(),
      signal: this.timeoutSignal(),
    });
  }

  async deleteRemoteSession(remoteSessionId: string): Promise<void> {
    await fetch(`${this.baseUrl()}/sessions/${remoteSessionId}`, {
      method: 'DELETE',
      headers: this.authHeaders(),
      signal: this.timeoutSignal(),
    });
  }
}

interface SseEvent {
  event: string;
  data: Record<string, any>;
}

function parseSseEvent(raw: string): SseEvent | null {
  let event = 'message';
  let data = '';
  for (const line of raw.split('\n')) {
    if (line.startsWith('event:')) event = line.slice(6).trim();
    else if (line.startsWith('data:')) data += line.slice(5).trim();
  }
  if (!data) return null;
  try {
    return { event, data: JSON.parse(data) as Record<string, any> };
  } catch {
    return null;
  }
}
