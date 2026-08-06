import { Test } from '@nestjs/testing';
import { AiAgentController } from './ai-agent.controller';
import { AiAgentService } from './ai-agent.service';

describe('AiAgentController', () => {
  const svc = {
    listAgentTypes: jest.fn().mockReturnValue(['vibe-trading']),
    createSession: jest.fn().mockResolvedValue({ id: 's1' }),
    listSessions: jest
      .fn()
      .mockResolvedValue({ data: [], total: 0, page: 1, pageSize: 10 }),
    getSession: jest.fn(),
    deleteSession: jest.fn(),
    getMessages: jest.fn(),
    cancelSession: jest.fn(),
    sendMessage: jest.fn(),
  };
  let ctrl: AiAgentController;

  beforeEach(async () => {
    const m = await Test.createTestingModule({
      controllers: [AiAgentController],
      providers: [{ provide: AiAgentService, useValue: svc }],
    })
      .overrideProvider(AiAgentService)
      .useValue(svc)
      .compile();
    ctrl = m.get(AiAgentController);
  });

  it('should list agent types on GET /agents', async () => {
    expect(await ctrl.listAgents()).toEqual({ data: ['vibe-trading'] });
  });

  it('should create a session on POST /sessions', async () => {
    const r = await ctrl.create({ id: 'u1' } as any, {
      agentType: 'vibe-trading',
    });
    expect(svc.createSession).toHaveBeenCalledWith(
      'u1',
      'vibe-trading',
      undefined,
    );
    expect(r).toEqual({ success: true, data: { id: 's1' } });
  });
});
