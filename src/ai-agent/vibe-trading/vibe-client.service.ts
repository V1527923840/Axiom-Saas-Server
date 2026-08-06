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

  async *sendMessage(
    remoteSessionId: string,
    content: string,
    signal: AbortSignal,
  ): AsyncIterable<SseChunk> {
    // Option B: real streaming via /sessions/{id}/events.
    // Upstream POST messages returns {message_id, attempt_id} synchronously; the
    // assistant reply streams out via text_delta events on /events. Yield each
    // delta to the frontend for a typewriter effect, then yield done on
    // attempt.completed (or error on failure / cancellation).
    const submitRes = await fetch(
      `${this.baseUrl()}/sessions/${remoteSessionId}/messages`,
      {
        method: 'POST',
        headers: this.authHeaders(),
        body: JSON.stringify({ content }),
        signal,
      },
    );
    if (!submitRes.ok) {
      throw new HttpException(
        {
          statusCode: HttpStatus.BAD_GATEWAY,
          message: `Vibe submit message failed: ${submitRes.status}`,
        },
        HttpStatus.BAD_GATEWAY,
      );
    }
    const { message_id, attempt_id } = (await submitRes.json()) as {
      message_id: string;
      attempt_id: string;
    };

    yield {
      type: 'message',
      data: {
        delta: '',
        status: 'submitted',
        messageId: message_id,
        attemptId: attempt_id,
      },
    };

    const eventsRes = await fetch(
      `${this.baseUrl()}/sessions/${remoteSessionId}/events`,
      {
        headers: this.authHeaders({ Accept: 'text/event-stream' }),
        signal,
      },
    );
    if (!eventsRes.ok || !eventsRes.body) {
      throw new HttpException(
        {
          statusCode: HttpStatus.BAD_GATEWAY,
          message: `Vibe events stream failed: ${eventsRes.status}`,
        },
        HttpStatus.BAD_GATEWAY,
      );
    }

    const reader = eventsRes.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let reply = '';
    try {
      while (true) {
        if (signal.aborted) {
          yield {
            type: 'error',
            data: { code: 'CANCELLED', message: 'Cancelled by client' },
          };
          return;
        }
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';
        for (const raw of events) {
          const parsed = parseSseEvent(raw);
          if (!parsed) continue;
          // Only react to events that belong to OUR attempt — concurrent
          // messages on the same session produce other attempts' events too.
          if (parsed.data.attempt_id && parsed.data.attempt_id !== attempt_id) {
            continue;
          }
          switch (parsed.event) {
            case 'text_delta':
              reply += parsed.data.delta ?? '';
              yield {
                type: 'message',
                data: {
                  delta: parsed.data.delta ?? '',
                  status: 'streaming',
                  attemptId: attempt_id,
                },
              };
              break;
            case 'attempt.completed':
              yield {
                type: 'message',
                data: {
                  delta: '',
                  status: 'completed',
                  attemptId: attempt_id,
                  fullReply: parsed.data.summary ?? reply,
                },
              };
              yield { type: 'done', data: { attemptId: attempt_id } };
              return;
            case 'attempt.error':
              yield {
                type: 'error',
                data: {
                  code: 'UPSTREAM_ERROR',
                  message: parsed.data.error ?? 'Upstream attempt error',
                  attemptId: attempt_id,
                },
              };
              return;
            // ignore: message.received, attempt.created, attempt.started, thinking_done
            default:
              break;
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    // Stream closed without attempt.completed — yield done anyway so the
    // frontend doesn't hang waiting for it.
    yield { type: 'done', data: { attemptId: attempt_id, partial: true } };
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
