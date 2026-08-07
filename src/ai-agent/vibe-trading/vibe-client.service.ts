import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AllConfigType } from '../../config/config.type';
import {
  AgentStreamEvent,
  MessageDto,
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
    // Intentionally no default Content-Type: callers that send JSON should
    // pass {'Content-Type': 'application/json'} via `extra`, while callers
    // that send FormData must let fetch auto-generate the multipart boundary.
    return {
      Authorization: `Bearer ${token}`,
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
      headers: this.authHeaders({ 'Content-Type': 'application/json' }),
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
        headers: this.authHeaders({ 'Content-Type': 'application/json' }),
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
  ): AsyncGenerator<AgentStreamEvent> {
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

  async uploadFile(
    buffer: Buffer,
    filename: string,
    mimetype: string,
  ): Promise<{ status: string; file_path: string; filename: string }> {
    const form = new FormData();
    const bytes = new Uint8Array(buffer);
    const blob = new Blob([bytes], { type: mimetype });
    form.append('file', blob, filename);
    const res = await fetch(`${this.baseUrl()}/upload`, {
      method: 'POST',
      // Do NOT set Content-Type manually here. When body is FormData, fetch
      // auto-generates the multipart boundary in the Content-Type header.
      // Setting it ourselves without the boundary breaks upstream parsers.
      headers: this.authHeaders(),
      body: form,
      signal: this.timeoutSignal(),
    });
    if (!res.ok) {
      throw new HttpException(
        {
          statusCode: res.status,
          message: `Vibe upload failed: ${res.status}`,
        },
        HttpStatus.BAD_GATEWAY,
      );
    }
    return res.json() as Promise<{
      status: string;
      file_path: string;
      filename: string;
    }>;
  }

  async createGoal(
    remoteSessionId: string,
    body: {
      objective: string;
      criteria?: string[];
      ui_summary?: string;
      protocol?: string;
      risk_tier?: string;
      token_budget?: number;
      turn_budget?: number;
      time_budget_seconds?: number;
    },
  ): Promise<unknown> {
    const res = await fetch(
      `${this.baseUrl()}/sessions/${encodeURIComponent(remoteSessionId)}/goal`,
      {
        method: 'POST',
        headers: this.authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(body),
        signal: this.timeoutSignal(),
      },
    );
    if (!res.ok)
      throw new HttpException(
        {
          statusCode: res.status,
          message: `Vibe createGoal failed: ${res.status}`,
        },
        HttpStatus.BAD_GATEWAY,
      );
    return res.json();
  }

  async getGoal(remoteSessionId: string): Promise<unknown> {
    const res = await fetch(
      `${this.baseUrl()}/sessions/${encodeURIComponent(remoteSessionId)}/goal`,
      {
        headers: this.authHeaders(),
        signal: this.timeoutSignal(),
      },
    );
    if (res.status === 404) return null;
    if (!res.ok)
      throw new HttpException(
        {
          statusCode: res.status,
          message: `Vibe getGoal failed: ${res.status}`,
        },
        HttpStatus.BAD_GATEWAY,
      );
    return res.json();
  }

  async updateGoal(
    remoteSessionId: string,
    body: {
      goal_id: string;
      expected_goal_id: string;
      objective?: string;
      ui_summary?: string;
    },
  ): Promise<unknown> {
    const res = await fetch(
      `${this.baseUrl()}/sessions/${encodeURIComponent(remoteSessionId)}/goal`,
      {
        method: 'PATCH',
        headers: this.authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(body),
        signal: this.timeoutSignal(),
      },
    );
    if (!res.ok)
      throw new HttpException(
        {
          statusCode: res.status,
          message: `Vibe updateGoal failed: ${res.status}`,
        },
        HttpStatus.BAD_GATEWAY,
      );
    return res.json();
  }

  async addGoalEvidence(
    remoteSessionId: string,
    body: unknown,
  ): Promise<unknown> {
    const res = await fetch(
      `${this.baseUrl()}/sessions/${encodeURIComponent(remoteSessionId)}/goal/evidence`,
      {
        method: 'POST',
        headers: this.authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(body),
        signal: this.timeoutSignal(),
      },
    );
    if (!res.ok)
      throw new HttpException(
        {
          statusCode: res.status,
          message: `Vibe addGoalEvidence failed: ${res.status}`,
        },
        HttpStatus.BAD_GATEWAY,
      );
    return res.json();
  }

  async updateGoalStatus(
    remoteSessionId: string,
    body: {
      goal_id: string;
      expected_goal_id: string;
      status: string;
      audit?: unknown;
      recap?: string;
    },
  ): Promise<unknown> {
    const res = await fetch(
      `${this.baseUrl()}/sessions/${encodeURIComponent(remoteSessionId)}/goal/status`,
      {
        method: 'PATCH',
        headers: this.authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(body),
        signal: this.timeoutSignal(),
      },
    );
    if (!res.ok)
      throw new HttpException(
        {
          statusCode: res.status,
          message: `Vibe updateGoalStatus failed: ${res.status}`,
        },
        HttpStatus.BAD_GATEWAY,
      );
    return res.json();
  }

  async listSwarmPresets(): Promise<unknown> {
    const res = await fetch(`${this.baseUrl()}/swarm/presets`, {
      headers: this.authHeaders(),
      signal: this.timeoutSignal(),
    });
    if (!res.ok)
      throw new HttpException(
        {
          statusCode: res.status,
          message: `Vibe listSwarmPresets failed: ${res.status}`,
        },
        HttpStatus.BAD_GATEWAY,
      );
    return res.json();
  }

  async createSwarmRun(
    presetName: string,
    userVars: Record<string, string>,
  ): Promise<{ id: string; status: string; preset_name: string }> {
    const res = await fetch(`${this.baseUrl()}/swarm/runs`, {
      method: 'POST',
      headers: this.authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ preset_name: presetName, user_vars: userVars }),
      signal: this.timeoutSignal(),
    });
    if (!res.ok)
      throw new HttpException(
        {
          statusCode: res.status,
          message: `Vibe createSwarmRun failed: ${res.status}`,
        },
        HttpStatus.BAD_GATEWAY,
      );
    return res.json() as Promise<{
      id: string;
      status: string;
      preset_name: string;
    }>;
  }

  async listSwarmRuns(limit: number): Promise<unknown> {
    const res = await fetch(
      `${this.baseUrl()}/swarm/runs?limit=${encodeURIComponent(String(limit))}`,
      {
        headers: this.authHeaders(),
        signal: this.timeoutSignal(),
      },
    );
    if (!res.ok)
      throw new HttpException(
        {
          statusCode: res.status,
          message: `Vibe listSwarmRuns failed: ${res.status}`,
        },
        HttpStatus.BAD_GATEWAY,
      );
    return res.json();
  }

  async getSwarmRun(runId: string): Promise<unknown> {
    const res = await fetch(
      `${this.baseUrl()}/swarm/runs/${encodeURIComponent(runId)}`,
      {
        headers: this.authHeaders(),
        signal: this.timeoutSignal(),
      },
    );
    if (!res.ok)
      throw new HttpException(
        {
          statusCode: res.status,
          message: `Vibe getSwarmRun failed: ${res.status}`,
        },
        HttpStatus.BAD_GATEWAY,
      );
    return res.json();
  }

  async cancelSwarmRun(runId: string): Promise<{ status: string }> {
    const res = await fetch(
      `${this.baseUrl()}/swarm/runs/${encodeURIComponent(runId)}/cancel`,
      {
        method: 'POST',
        headers: this.authHeaders(),
        signal: this.timeoutSignal(),
      },
    );
    if (!res.ok)
      throw new HttpException(
        {
          statusCode: res.status,
          message: `Vibe cancelSwarmRun failed: ${res.status}`,
        },
        HttpStatus.BAD_GATEWAY,
      );
    return res.json() as Promise<{ status: string }>;
  }

  async retrySwarmRun(
    runId: string,
  ): Promise<{ id: string; status: string; preset_name: string }> {
    const res = await fetch(
      `${this.baseUrl()}/swarm/runs/${encodeURIComponent(runId)}/retry`,
      {
        method: 'POST',
        headers: this.authHeaders(),
        signal: this.timeoutSignal(),
      },
    );
    if (!res.ok)
      throw new HttpException(
        {
          statusCode: res.status,
          message: `Vibe retrySwarmRun failed: ${res.status}`,
        },
        HttpStatus.BAD_GATEWAY,
      );
    return res.json() as Promise<{
      id: string;
      status: string;
      preset_name: string;
    }>;
  }
}

/**
 * Parse one SSE frame (text between blank lines) into {event, data}.
 * Returns null for empty frames or frames with no usable data.
 */
function parseSseFrame(raw: string): AgentStreamEvent | null {
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
