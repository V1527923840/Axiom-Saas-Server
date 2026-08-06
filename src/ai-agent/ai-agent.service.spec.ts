import { AiAgentService } from './ai-agent.service';
import { NotFoundException } from '@nestjs/common';

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
    getMessages: jest.fn(),
    cancelRemoteSession: jest.fn(),
    deleteRemoteSession: jest.fn(),
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
});
