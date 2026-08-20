import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  MessageEvent,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';
import { AllConfigType } from '../config/config.type';
import { AiSessionRepository } from './infrastructure/persistence/ai-session.repository';
import { AgentAdapterRegistry } from './infrastructure/agent-adapter.registry';
import { QuotaService } from './infrastructure/quota/quota.service';
import { ConcurrencyService } from './infrastructure/concurrency/concurrency.service';
import { AiSession } from './domain/ai-session';
import { MessageDto } from './interfaces/agent-adapter.interface';
import { SkillResolverService } from '../skills/skill-resolver.service';

@Injectable()
export class AiAgentService {
  private readonly logger = new Logger(AiAgentService.name);

  constructor(
    private readonly repo: AiSessionRepository,
    private readonly registry: AgentAdapterRegistry,
    private readonly quota: QuotaService,
    private readonly concurrency: ConcurrencyService,
    private readonly configService: ConfigService<AllConfigType>,
    // ★ Skill Plaza: resolve active skills (user baseline + session mount delta)
    // for every sendMessage call. Empty array on failure (never blocks chat).
    private readonly skillResolver: SkillResolverService,
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

  async updateSession(
    userId: number | string,
    id: string,
    patch: { title?: string },
  ): Promise<AiSession> {
    const session = await this.getSession(userId, id);
    if (patch.title !== undefined) session.title = patch.title;
    session.lastActiveAt = new Date();
    const updated = await this.repo.update(session.id, {
      title: session.title,
      lastActiveAt: session.lastActiveAt,
    });
    return updated as AiSession;
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
    // Cancel only stops the current attempt; the session itself stays active and
    // remains usable for new messages. Release the inflight lock so the next
    // submitMessage can acquire it.
    await this.registry.get(s.agentType).cancelRemoteSession(s.remoteSessionId);
    await this.concurrency.release(s.id);
  }

  /**
   * Controller-only 暴露:在 SSE teardown 时调用,释放可能仍持有的 inflight 锁。
   * 使用 fire-and-forget,不阻塞 teardown。
   */
  async releaseSessionLock(sessionId: string): Promise<void> {
    await this.concurrency.release(sessionId);
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

    // ★ Skill Plaza: resolve which skills this user/session has enabled,
    // merged with any session-level add/remove deltas (spec §3.5.1).
    // Real-time (no cache) — user toggles take effect on the next message.
    // The resolver degrades to [] on failure and never throws.
    let resolvedSkills: { id: string; code: string; name: string }[];
    try {
      resolvedSkills = await this.skillResolver.resolve(
        typeof userId === 'string' ? parseInt(userId, 10) : userId,
        id,
      );
    } catch (e) {
      // Defensive — SkillResolverService.resolve already swallows errors and
      // returns []; this catch is a belt-and-suspenders guard.
      this.logger.warn(
        `skill resolver threw unexpectedly for user=${userId} session=${id}: ${(e as Error).message}`,
      );
      resolvedSkills = [];
    }

    try {
      const adapter = this.registry.get(s.agentType);
      // Forward {id, code, name} so VibeTrading's allowed_ids set can accept
      // any of the three — see SkillRef / allowed_ids rationale in the
      // agent-adapter interface docstring (2026-08-20).
      const skillRefs = resolvedSkills.map((s) => ({
        id: s.id,
        code: s.code,
        name: s.name,
      }));
      const result = await adapter.submitMessage(
        s.remoteSessionId,
        content,
        new AbortController().signal, // 提交阶段的 cancel 由 inflight 锁 + 后续 /cancel 端点控制
        skillRefs,
        userId, // ★ User-scope: forwarded so vibe can apply per-user skill injection
      );
      return result;
    } catch (e) {
      await this.concurrency.release(s.id);
      throw e;
    }
  }

  /**
   * 订阅 session 的事件流，返回 rxjs Observable。
   * View 层通过 @Sse() 装饰器消费。
   *
   * 副作用:
   * - attempt.completed → 释放 inflight 锁 + 更新 lastActiveAt/expiresAt
   * - attempt.error     → 释放 inflight 锁 + 标记 status='error'
   * - AbortSignal abort → 立即完成 Observable
   */
  streamEvents(
    userId: number | string,
    id: string,
    signal: AbortSignal,
  ): Observable<MessageEvent> {
    return new Observable<MessageEvent>((subscriber) => {
      let aborted = false;
      const onAbort = () => {
        aborted = true;
        subscriber.complete();
      };
      signal.addEventListener('abort', onAbort);

      void (async () => {
        let s: AiSession;
        try {
          s = await this.getSession(userId, id);
        } catch (e) {
          // Owner-check failures (e.g. NotFoundException) propagate to the
          // Observable's error channel — the @Sse() controller surfaces them
          // as proper HTTP 4xx/5xx responses to the client.
          if (!aborted) subscriber.error(e);
          return;
        }
        try {
          if (aborted) return;
          if (!s.remoteSessionId) {
            subscriber.next({
              type: 'error',
              data: { code: 'NO_REMOTE_SESSION' },
            });
            subscriber.complete();
            return;
          }

          const adapter = this.registry.get(s.agentType);
          for await (const ev of adapter.streamEvents(
            s.remoteSessionId,
            signal,
          )) {
            if (aborted) break;
            subscriber.next({ type: ev.event, data: ev.data });

            if (ev.event === 'attempt.completed') {
              const now = new Date();
              const ttlDays =
                this.configService.get('aiAgent.ttlDays', { infer: true }) ??
                30;
              await this.concurrency.release(s.id);
              await this.repo.update(s.id, {
                lastActiveAt: now,
                expiresAt: new Date(now.getTime() + ttlDays * 86400_000),
                status: 'active',
              });
            } else if (ev.event === 'attempt.error') {
              await this.concurrency.release(s.id);
              await this.repo.update(s.id, { status: 'error' });
            }
          }
          subscriber.complete();
        } catch (e) {
          if (!aborted) {
            subscriber.next({
              type: 'error',
              data: { code: 'STREAM_ERROR', message: (e as Error).message },
            });
            subscriber.complete();
            // 释放可能仍持有的 inflight 锁 —— 上游流挂掉时 attempt.completed/attempt.error 不会到达
            void this.concurrency.release(s.id).catch(() => undefined);
          }
        }
      })();

      return () => {
        aborted = true;
        signal.removeEventListener('abort', onAbort);
      };
    });
  }
}
