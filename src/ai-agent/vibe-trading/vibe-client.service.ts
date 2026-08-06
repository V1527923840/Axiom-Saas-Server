import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AllConfigType } from '../../config/config.type';
import { MessageDto } from '../interfaces/agent-adapter.interface';

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

  /**
   * 长连接订阅上游 session 的事件流。
   * 上游会推送该 session 上所有 attempt 的事件（text_delta / attempt.completed / attempt.error 等）。
   * 调用方按 attempt_id 自行路由。
   */
  async *streamEvents(
    remoteSessionId: string,
    signal: AbortSignal,
  ): AsyncGenerator<{ event: string; data: Record<string, any> }> {
    const res = await fetch(
      `${this.baseUrl()}/sessions/${remoteSessionId}/events`,
      {
        headers: this.authHeaders({ Accept: 'text/event-stream' }),
        signal,
      },
    );
    if (!res.ok || !res.body) {
      throw new HttpException(
        {
          statusCode: HttpStatus.BAD_GATEWAY,
          message: `Vibe events stream failed: ${res.status}`,
        },
        HttpStatus.BAD_GATEWAY,
      );
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) return;
        buf += decoder.decode(value, { stream: true });
        const frames = buf.split('\n\n');
        buf = frames.pop() ?? '';
        for (const raw of frames) {
          const parsed = parseSseFrame(raw);
          if (parsed) yield parsed;
        }
      }
    } finally {
      reader.releaseLock();
    }
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

/**
 * Parse one SSE frame (text between blank lines) into {event, data}.
 * Returns null for empty frames or frames with no usable data.
 */
function parseSseFrame(
  raw: string,
): { event: string; data: Record<string, any> } | null {
  const lines = raw.split('\n');
  let event = 'message';
  const dataLines: string[] = [];
  for (const line of lines) {
    if (!line || line.startsWith(':')) continue;
    const colon = line.indexOf(':');
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? '' : line.slice(colon + 1);
    if (value.startsWith(' ')) value = value.slice(1);
    if (field === 'event') event = value;
    else if (field === 'data') dataLines.push(value);
  }
  if (dataLines.length === 0) return null;
  const joined = dataLines.join('\n');
  try {
    return { event, data: JSON.parse(joined) };
  } catch {
    return { event, data: { raw: joined } };
  }
}
