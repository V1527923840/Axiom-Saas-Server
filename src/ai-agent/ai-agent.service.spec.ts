import { AiAgentService } from './ai-agent.service';
import { NotFoundException } from '@nestjs/common';
import { firstValueFrom, toArray } from 'rxjs';

describe('AiAgentService', () => {
  const repo = {
    findByIdAndUser: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    softDeleteById: jest.fn(),
    findManyByUser: jest.fn(),
  };
  const adapter = {
    agentType: 'vibe-trading',
    createRemoteSession: jest
      .fn()
      .mockResolvedValue({ remoteSessionId: 'remote-1' }),
    sendMessage: jest.fn(),
    submitMessage: jest.fn(),
    getMessages: jest.fn(),
    cancelRemoteSession: jest.fn(),
    deleteRemoteSession: jest.fn(),
    streamEvents: jest.fn(),
  };
  const registry = {
    get: jest.fn().mockReturnValue(adapter),
    listAgentTypes: jest.fn(),
  };
  const quota = { checkAndIncrement: jest.fn() };
  const concurrency = { acquire: jest.fn(), release: jest.fn() };
  const cfg = { get: (k: string) => ({ 'aiAgent.ttlDays': 30 })[k] };

  const svc = new AiAgentService(
    repo as any,
    registry as any,
    quota as any,
    concurrency as any,
    cfg as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    concurrency.acquire.mockResolvedValue(undefined);
    concurrency.release.mockResolvedValue(undefined);
    quota.checkAndIncrement.mockResolvedValue(undefined);
    registry.get.mockReturnValue(adapter);
  });

  it('should reject unknown agent type on createSession', async () => {
    registry.get.mockImplementation(() => {
      throw new Error('unknown agent type: foo');
    });
    await expect(svc.createSession('u1', 'foo')).rejects.toThrow(
      /unknown agent/i,
    );
  });

  it('should create session: call adapter, persist, return', async () => {
    const created = { id: 'local-1', userId: 'u1', agentType: 'vibe-trading' };
    repo.create.mockResolvedValue(created);
    const r = await svc.createSession('u1', 'vibe-trading');
    expect(adapter.createRemoteSession).toHaveBeenCalledWith();
    expect(repo.create).toHaveBeenCalled();
    expect(r).toEqual(created);
  });

  it('should return 404 when session not found', async () => {
    repo.findByIdAndUser.mockResolvedValue(null);
    await expect(svc.getSession('u1', 'sid')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  describe('updateSession', () => {
    it('should reject if session not owned', async () => {
      repo.findByIdAndUser.mockResolvedValue(null);
      await expect(
        svc.updateSession('u1', 's1', { title: 'x' }),
      ).rejects.toThrow(/not found/i);
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('should patch title and bump lastActiveAt', async () => {
      const baselineLastActiveAt = new Date(0).getTime();
      const existing = {
        id: 's1',
        userId: 'u1',
        agentType: 'vibe-trading',
        title: null,
        status: 'active',
        lastActiveAt: new Date(0),
        expiresAt: new Date(0),
      };
      repo.findByIdAndUser.mockResolvedValue(existing);
      const saved = {
        ...existing,
        title: 'new',
        lastActiveAt: expect.any(Date),
      };
      repo.update.mockResolvedValue(saved);

      const r = await svc.updateSession('u1', 's1', { title: 'new' });
      expect(r.title).toBe('new');
      expect(repo.update).toHaveBeenCalledWith(
        's1',
        expect.objectContaining({ title: 'new' }),
      );
      const updateArg = repo.update.mock.calls[0][1];
      expect(updateArg.lastActiveAt).toBeInstanceOf(Date);
      expect(updateArg.lastActiveAt.getTime()).toBeGreaterThan(
        baselineLastActiveAt,
      );
    });

    it('should ignore fields not in patch', async () => {
      repo.findByIdAndUser.mockResolvedValue({
        id: 's1',
        userId: 'u1',
        agentType: 'vibe-trading',
        title: 'old',
        status: 'active',
        lastActiveAt: new Date(),
        expiresAt: new Date(),
      });
      repo.update.mockResolvedValue({});
      await svc.updateSession('u1', 's1', {});
      const updateArg = repo.update.mock.calls[0][1];
      expect(updateArg).not.toHaveProperty('status');
      expect(updateArg).not.toHaveProperty('agentType');
      expect(Object.keys(updateArg).sort()).toEqual(['lastActiveAt', 'title']);
      expect(updateArg.title).toBe('old');
    });
  });

  it('should soft-delete then notify adapter', async () => {
    repo.findByIdAndUser.mockResolvedValue({
      id: 'sid',
      userId: 'u1',
      remoteSessionId: 'r1',
      status: 'active',
    });
    await svc.deleteSession('u1', 'sid');
    expect(repo.softDeleteById).toHaveBeenCalledWith('sid');
    expect(adapter.deleteRemoteSession).toHaveBeenCalledWith('r1');
  });

  describe('submitMessage', () => {
    it('should reject if session not owned by user', async () => {
      repo.findByIdAndUser.mockResolvedValue(null);
      await expect(svc.submitMessage('u1', 's1', 'hi')).rejects.toThrow(
        /not found/i,
      );
      expect(adapter.submitMessage).not.toHaveBeenCalled();
    });

    it('should reject if concurrency lock not acquired', async () => {
      repo.findByIdAndUser.mockResolvedValue({
        id: 's1',
        userId: 'u1',
        agentType: 'vibe-trading',
        remoteSessionId: 'r1',
        status: 'active',
      });
      concurrency.acquire.mockRejectedValue(new Error('locked'));
      await expect(svc.submitMessage('u1', 's1', 'hi')).rejects.toThrow(
        /locked/,
      );
      expect(adapter.submitMessage).not.toHaveBeenCalled();
    });

    it('should submit, persist, return messageId + attemptId', async () => {
      repo.findByIdAndUser.mockResolvedValue({
        id: 's1',
        userId: 'u1',
        agentType: 'vibe-trading',
        remoteSessionId: 'r1',
        status: 'active',
      });
      adapter.submitMessage = jest.fn().mockResolvedValue({
        messageId: 'm-1',
        attemptId: 'a-1',
      });
      const r = await svc.submitMessage('u1', 's1', 'hi');
      expect(r).toEqual({ messageId: 'm-1', attemptId: 'a-1' });
      expect(adapter.submitMessage).toHaveBeenCalledWith(
        'r1',
        'hi',
        expect.any(AbortSignal),
      );
      expect(quota.checkAndIncrement).toHaveBeenCalledWith('s1');
      // inflight lock NOT released — events stream completion releases it
      expect(concurrency.release).not.toHaveBeenCalled();
    });

    it('should release inflight lock if submit fails', async () => {
      repo.findByIdAndUser.mockResolvedValue({
        id: 's1',
        userId: 'u1',
        agentType: 'vibe-trading',
        remoteSessionId: 'r1',
        status: 'active',
      });
      adapter.submitMessage = jest
        .fn()
        .mockRejectedValue(new Error('upstream down'));
      await expect(svc.submitMessage('u1', 's1', 'hi')).rejects.toThrow(
        /upstream/,
      );
      expect(concurrency.release).toHaveBeenCalledWith('s1');
    });
  });

  describe('streamEvents', () => {
    it('should reject if session not owned', async () => {
      repo.findByIdAndUser.mockResolvedValue(null);
      const obs = svc.streamEvents('u1', 's1', new AbortController().signal);
      await expect(firstValueFrom(obs)).rejects.toThrow(/not found/i);
    });

    it('should emit upstream events as MessageEvent', async () => {
      repo.findByIdAndUser.mockResolvedValue({
        id: 's1',
        userId: 'u1',
        agentType: 'vibe-trading',
        remoteSessionId: 'r1',
        status: 'active',
      });
      adapter.streamEvents = jest.fn().mockImplementation(async function* () {
        await Promise.resolve();
        yield { event: 'text_delta', data: { attempt_id: 'a1', delta: 'hel' } };
        yield { event: 'text_delta', data: { attempt_id: 'a1', delta: 'lo' } };
        yield {
          event: 'attempt.completed',
          data: { attempt_id: 'a1', summary: 'hello' },
        };
      });

      const events = await firstValueFrom(
        svc
          .streamEvents('u1', 's1', new AbortController().signal)
          .pipe(toArray()),
      );
      expect(events).toEqual([
        { type: 'text_delta', data: { attempt_id: 'a1', delta: 'hel' } },
        { type: 'text_delta', data: { attempt_id: 'a1', delta: 'lo' } },
        {
          type: 'attempt.completed',
          data: { attempt_id: 'a1', summary: 'hello' },
        },
      ]);
    });

    it('should release inflight lock on attempt.completed', async () => {
      repo.findByIdAndUser.mockResolvedValue({
        id: 's1',
        userId: 'u1',
        agentType: 'vibe-trading',
        remoteSessionId: 'r1',
        status: 'active',
      });
      adapter.streamEvents = jest.fn().mockImplementation(async function* () {
        await Promise.resolve();
        yield {
          event: 'attempt.completed',
          data: { attempt_id: 'a1', summary: 'x' },
        };
      });
      await firstValueFrom(
        svc
          .streamEvents('u1', 's1', new AbortController().signal)
          .pipe(toArray()),
      );
      expect(concurrency.release).toHaveBeenCalledWith('s1');
      expect(repo.update).toHaveBeenCalledWith(
        's1',
        expect.objectContaining({ lastActiveAt: expect.any(Date) }),
      );
    });

    it('should release inflight lock on attempt.error', async () => {
      repo.findByIdAndUser.mockResolvedValue({
        id: 's1',
        userId: 'u1',
        agentType: 'vibe-trading',
        remoteSessionId: 'r1',
        status: 'active',
      });
      adapter.streamEvents = jest.fn().mockImplementation(async function* () {
        await Promise.resolve();
        yield {
          event: 'attempt.error',
          data: { attempt_id: 'a1', error: 'oops' },
        };
      });
      await firstValueFrom(
        svc
          .streamEvents('u1', 's1', new AbortController().signal)
          .pipe(toArray()),
      );
      expect(concurrency.release).toHaveBeenCalledWith('s1');
    });

    it('should release inflight lock on upstream stream error', async () => {
      repo.findByIdAndUser.mockResolvedValue({
        id: 's1',
        userId: 'u1',
        agentType: 'vibe-trading',
        remoteSessionId: 'r1',
        status: 'active',
      });
      adapter.streamEvents = jest.fn().mockImplementation(async function* () {
        await Promise.resolve();
        // simulate upstream fetch / parse error mid-stream
        throw new Error('upstream fetch failed');
      });
      const events = await firstValueFrom(
        svc
          .streamEvents('u1', 's1', new AbortController().signal)
          .pipe(toArray()),
      );
      // error event delivered to client before lock release
      expect(events).toEqual([
        {
          type: 'error',
          data: { code: 'STREAM_ERROR', message: 'upstream fetch failed' },
        },
      ]);
      // fire-and-forget release — give the microtask a tick to flush
      await Promise.resolve();
      await Promise.resolve();
      expect(concurrency.release).toHaveBeenCalledWith('s1');
    });
  });

  describe('cancelSession — inflight lock release', () => {
    it('should release inflight lock when cancelling an active session', async () => {
      repo.findByIdAndUser.mockResolvedValue({
        id: 's1',
        userId: 'u1',
        agentType: 'vibe-trading',
        remoteSessionId: 'r1',
        status: 'active',
        inflightStartedAt: new Date(),
      });
      adapter.cancelRemoteSession = jest.fn().mockResolvedValue(undefined);
      await svc.cancelSession('u1', 's1');
      // release must run before status update
      const releaseOrder = concurrency.release.mock.invocationCallOrder[0];
      const updateCallOrder =
        repo.update.mock.invocationCallOrder[0] ?? Number.MAX_SAFE_INTEGER;
      expect(concurrency.release).toHaveBeenCalledWith('s1');
      expect(repo.update).toHaveBeenCalledWith(
        's1',
        expect.objectContaining({ status: 'cancelled' }),
      );
      expect(releaseOrder).toBeLessThan(updateCallOrder);
    });

    it('should release lock even if status update fails', async () => {
      repo.findByIdAndUser.mockResolvedValue({
        id: 's1',
        userId: 'u1',
        agentType: 'vibe-trading',
        remoteSessionId: 'r1',
        status: 'active',
      });
      adapter.cancelRemoteSession = jest.fn().mockResolvedValue(undefined);
      repo.update.mockRejectedValue(new Error('db down'));
      await expect(svc.cancelSession('u1', 's1')).rejects.toThrow(/db down/);
      // defensive: release happens BEFORE update, so lock is free even when update throws
      expect(concurrency.release).toHaveBeenCalledWith('s1');
    });
  });

  describe('releaseSessionLock', () => {
    it('should delegate to concurrency.release with the given session id', async () => {
      await svc.releaseSessionLock('s1');
      expect(concurrency.release).toHaveBeenCalledWith('s1');
    });
  });
});
