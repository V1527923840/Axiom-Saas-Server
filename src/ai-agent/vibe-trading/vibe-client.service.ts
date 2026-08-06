import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AllConfigType } from '../../config/config.type';
import {
  MessageDto,
  SseChunk,
  SseChunkType,
} from '../interfaces/agent-adapter.interface';

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

  async createRemoteSession(
    ownerId: string,
  ): Promise<{ remoteSessionId: string }> {
    const res = await fetch(`${this.baseUrl()}/sessions`, {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify({ owner_id: ownerId }),
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
    const data = (await res.json()) as { id: string };
    return { remoteSessionId: data.id };
  }

  async *sendMessage(
    remoteSessionId: string,
    content: string,
    signal: AbortSignal,
  ): AsyncIterable<SseChunk> {
    const res = await fetch(
      `${this.baseUrl()}/sessions/${remoteSessionId}/messages`,
      {
        method: 'POST',
        headers: this.authHeaders({ Accept: 'text/event-stream' }),
        body: JSON.stringify({ content }),
        signal,
      },
    );
    if (!res.ok || !res.body) {
      throw new HttpException(
        {
          statusCode: HttpStatus.BAD_GATEWAY,
          message: `Vibe stream failed: ${res.status}`,
        },
        HttpStatus.BAD_GATEWAY,
      );
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';
        for (const ev of events) {
          const chunk = parseSseEvent(ev);
          if (chunk) yield chunk;
        }
      }
      if (buffer.trim()) {
        const chunk = parseSseEvent(buffer);
        if (chunk) yield chunk;
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
    const data = (await res.json()) as { messages: any[] };
    return (data.messages ?? []).map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: new Date(m.created_at ?? Date.now()),
      meta: m.meta,
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

function parseSseEvent(raw: string): SseChunk | null {
  let event = 'message';
  let data = '';
  for (const line of raw.split('\n')) {
    if (line.startsWith('event:')) event = line.slice(6).trim();
    else if (line.startsWith('data:')) data += line.slice(5).trim();
  }
  if (!data) return null;
  try {
    const parsed = JSON.parse(data);
    const type = (parsed.type ?? event) as SseChunkType;
    return { type, data: parsed.data ?? parsed };
  } catch {
    return { type: event as SseChunkType, data: { raw: data } };
  }
}
