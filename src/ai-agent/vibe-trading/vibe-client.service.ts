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
    // Option A: sync-poll pattern.
    // Upstream POST messages returns synchronously with {message_id, attempt_id}.
    // The actual assistant reply appears later in GET messages — we poll for it
    // and yield the content as a single chunk. Future Option B: replace polling
    // with a long-lived /events stream connection.
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

    // Poll GET messages for the assistant reply, up to ~55s (under default 60s timeout).
    const deadline = Date.now() + 55_000;
    const initialMessages = await this.getMessages(remoteSessionId);
    const baselineIds = new Set(
      initialMessages.map((m) => m.id ?? '').filter(Boolean),
    );
    const baselineTimestamp = initialMessages.reduce(
      (max, m) => Math.max(max, m.createdAt?.getTime?.() ?? 0),
      0,
    );

    while (Date.now() < deadline) {
      if (signal.aborted) {
        yield {
          type: 'error',
          data: { code: 'CANCELLED', message: 'Cancelled by client' },
        };
        return;
      }
      await sleep(1000);
      if (signal.aborted) {
        yield {
          type: 'error',
          data: { code: 'CANCELLED', message: 'Cancelled by client' },
        };
        return;
      }
      const current = await this.getMessages(remoteSessionId);
      const fresh = current.filter((m) => {
        const id = m.id ?? '';
        const ts = m.createdAt?.getTime?.() ?? 0;
        return (
          !baselineIds.has(id) && ts >= baselineTimestamp && m.role !== 'user'
        );
      });
      // Take the last fresh message (most recent assistant reply).
      const assistantMsg = fresh[fresh.length - 1];
      if (assistantMsg?.content) {
        yield {
          type: 'message',
          data: {
            delta: assistantMsg.content,
            status: 'completed',
            messageId: assistantMsg.id,
            attemptId: attempt_id,
          },
        };
        yield { type: 'done', data: { attemptId: attempt_id } };
        return;
      }
    }

    yield {
      type: 'error',
      data: {
        code: 'TIMEOUT',
        message: 'Assistant response timed out',
        attemptId: attempt_id,
      },
    };
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
