import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AllConfigType } from '../config/config.type';
import { AiSessionRepository } from './infrastructure/persistence/ai-session.repository';
import { AgentAdapterRegistry } from './infrastructure/agent-adapter.registry';
import { QuotaService } from './infrastructure/quota/quota.service';
import { ConcurrencyService } from './infrastructure/concurrency/concurrency.service';
import { AiSession } from './domain/ai-session';
import { MessageDto, SseChunk } from './interfaces/agent-adapter.interface';

@Injectable()
export class AiAgentService {
  constructor(
    private readonly repo: AiSessionRepository,
    private readonly registry: AgentAdapterRegistry,
    private readonly quota: QuotaService,
    private readonly concurrency: ConcurrencyService,
    private readonly configService: ConfigService<AllConfigType>,
  ) {}

  listAgentTypes(): string[] {
    return this.registry.listAgentTypes();
  }

  async createSession(
    userId: number | string,
    agentType: string,
    title?: string,
  ): Promise<AiSession> {
    const adapter = this.registry.get(agentType);
    const ttlDays =
      this.configService.get('aiAgent.ttlDays', { infer: true }) ?? 30;
    const now = new Date();
    const { remoteSessionId } = await adapter.createRemoteSession(
      String(userId),
    );
    return this.repo.create({
      userId,
      agentType,
      remoteSessionId,
      title: title ?? null,
      status: 'active',
      lastActiveAt: now,
      expiresAt: new Date(now.getTime() + ttlDays * 86400_000),
      quotaCount: 0,
      quotaDate: now,
      inflightStartedAt: null,
    } as any);
  }

  async listSessions(
    userId: number | string,
    agentType: string,
    page: number,
    pageSize: number,
  ) {
    return this.repo.findManyByUser({ userId, agentType, page, pageSize });
  }

  async getSession(userId: number | string, id: string): Promise<AiSession> {
    const s = await this.repo.findByIdAndUser(id, userId);
    if (!s)
      throw new NotFoundException({
        statusCode: 404,
        message: 'Session not found',
      });
    return s;
  }

  async deleteSession(userId: number | string, id: string): Promise<void> {
    const s = await this.getSession(userId, id);
    await this.repo.softDeleteById(s.id);
    if (s.remoteSessionId) {
      try {
        await this.registry
          .get(s.agentType)
          .deleteRemoteSession(s.remoteSessionId);
      } catch {
        // 远端删除失败不阻塞 — 本地已软删
      }
    }
  }

  async getMessages(
    userId: number | string,
    id: string,
    cursor?: string,
  ): Promise<MessageDto[]> {
    const s = await this.getSession(userId, id);
    if (!s.remoteSessionId) return [];
    return this.registry
      .get(s.agentType)
      .getMessages(s.remoteSessionId, cursor);
  }

  async cancelSession(userId: number | string, id: string): Promise<void> {
    const s = await this.getSession(userId, id);
    if (!s.remoteSessionId) return;
    await this.registry.get(s.agentType).cancelRemoteSession(s.remoteSessionId);
    await this.repo.update(s.id, { status: 'cancelled' });
  }

  async *sendMessage(
    userId: number | string,
    id: string,
    content: string,
  ): AsyncIterable<SseChunk> {
    const s = await this.getSession(userId, id);
    if (s.status === 'cancelled') {
      yield {
        type: 'error',
        data: { code: 'SESSION_CANCELLED', message: 'Session cancelled' },
      };
      return;
    }

    await this.concurrency.acquire(s.id);
    try {
      await this.quota.checkAndIncrement(s.id);

      const adapter = this.registry.get(s.agentType);
      const ac = new AbortController();
      try {
        for await (const chunk of adapter.sendMessage(
          s.remoteSessionId!,
          content,
          ac.signal,
        )) {
          yield chunk;
        }
      } catch (e) {
        yield {
          type: 'error',
          data: { code: 'UPSTREAM_ERROR', message: (e as Error).message },
        };
        await this.repo.update(s.id, { status: 'error' });
        return;
      }

      // 流成功完成:续期 TTL
      const now = new Date();
      const ttlDays =
        this.configService.get('aiAgent.ttlDays', { infer: true }) ?? 30;
      await this.repo.update(s.id, {
        lastActiveAt: now,
        expiresAt: new Date(now.getTime() + ttlDays * 86400_000),
        status: 'active',
      });
    } finally {
      await this.concurrency.release(s.id);
    }
  }
}
