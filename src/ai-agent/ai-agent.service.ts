import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AllConfigType } from '../config/config.type';
import { AiSessionRepository } from './infrastructure/persistence/ai-session.repository';
import { AgentAdapterRegistry } from './infrastructure/agent-adapter.registry';
import { QuotaService } from './infrastructure/quota/quota.service';
import { ConcurrencyService } from './infrastructure/concurrency/concurrency.service';
import { AiSession } from './domain/ai-session';
import { MessageDto } from './interfaces/agent-adapter.interface';

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
    const { remoteSessionId } = await adapter.createRemoteSession();
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

  /**
   * 同步提交一条消息到上游，返回上游分配的 messageId + attemptId。
   * 流式响应通过 streamEvents() 走独立 SSE 通道；本方法不消费任何流。
   *
   * inflight 锁的获取时机：成功拿到后**不释放**——流完成 / cancel / 错误 时才释放。
   * 失败的兜底：adapter.submitMessage 抛错 → finally 释放锁。
   */
  async submitMessage(
    userId: number | string,
    id: string,
    content: string,
  ): Promise<{ messageId: string; attemptId: string }> {
    const s = await this.getSession(userId, id);
    if (s.status === 'cancelled') {
      throw new HttpException(
        { statusCode: HttpStatus.CONFLICT, message: 'Session cancelled' },
        HttpStatus.CONFLICT,
      );
    }
    if (!s.remoteSessionId) {
      throw new HttpException(
        {
          statusCode: HttpStatus.CONFLICT,
          message: 'Session has no remote id yet',
        },
        HttpStatus.CONFLICT,
      );
    }

    await this.concurrency.acquire(s.id);
    await this.quota.checkAndIncrement(s.id);

    try {
      const adapter = this.registry.get(s.agentType);
      const result = await adapter.submitMessage(
        s.remoteSessionId,
        content,
        new AbortController().signal, // 提交阶段的 cancel 由 inflight 锁 + 后续 /cancel 端点控制
      );
      return result;
    } catch (e) {
      await this.concurrency.release(s.id);
      throw e;
    }
  }
}
