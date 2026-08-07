import { Test } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { AiAgentController } from './ai-agent.controller';
import { AiAgentService } from './ai-agent.service';
import { VibeClientService } from './vibe-trading/vibe-client.service';

describe('AiAgentController', () => {
  const svc = {
    listAgentTypes: jest.fn().mockReturnValue(['vibe-trading']),
    createSession: jest.fn().mockResolvedValue({ id: 's1' }),
    listSessions: jest
      .fn()
      .mockResolvedValue({ data: [], total: 0, page: 1, pageSize: 10 }),
    getSession: jest
      .fn()
      .mockResolvedValue({ id: 's1', remoteSessionId: 'r1' }),
    deleteSession: jest.fn(),
    getMessages: jest.fn(),
    cancelSession: jest.fn(),
    sendMessage: jest.fn(),
    submitMessage: jest.fn(),
  };

  const vibe = {
    createGoal: jest.fn(),
    getGoal: jest.fn(),
    updateGoal: jest.fn(),
    addGoalEvidence: jest.fn(),
    updateGoalStatus: jest.fn(),
    listSwarmPresets: jest.fn(),
    createSwarmRun: jest.fn(),
    listSwarmRuns: jest.fn(),
    getSwarmRun: jest.fn(),
    cancelSwarmRun: jest.fn(),
    retrySwarmRun: jest.fn(),
  };

  let ctrl: AiAgentController;

  beforeEach(async () => {
    Object.values(svc).forEach((fn) => (fn as jest.Mock).mockReset?.());
    Object.values(vibe).forEach((fn) => (fn as jest.Mock).mockReset?.());
    (svc.listAgentTypes as jest.Mock).mockReturnValue(['vibe-trading']);
    (svc.getSession as jest.Mock).mockResolvedValue({
      id: 's1',
      remoteSessionId: 'r1',
    });

    const m = await Test.createTestingModule({
      controllers: [AiAgentController],
      providers: [
        { provide: AiAgentService, useValue: svc },
        { provide: VibeClientService, useValue: vibe },
      ],
    })
      .overrideProvider(AiAgentService)
      .useValue(svc)
      .overrideProvider(VibeClientService)
      .useValue(vibe)
      .compile();
    ctrl = m.get(AiAgentController);
  });

  it('should list agent types on GET /agents', async () => {
    expect(await ctrl.listAgents()).toEqual({ data: ['vibe-trading'] });
  });

  it('should create a session on POST /sessions', async () => {
    (svc.createSession as jest.Mock).mockResolvedValue({ id: 's1' });
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

  // ---------------- goal/swarm routes (Task 2) ----------------

  describe('goal/swarm routes', () => {
    // ---- createGoal ----
    it('should call createGoal on POST /sessions/:id/goal and pass through vibe response', async () => {
      (vibe.createGoal as jest.Mock).mockResolvedValue({
        goal_id: 'g1',
        status: 'active',
      });
      const r = await ctrl.createGoal({ id: 'u1' } as any, 's1', {
        objective: 'reach 20% growth',
      } as any);
      expect(svc.getSession).toHaveBeenCalledWith('u1', 's1');
      expect(vibe.createGoal).toHaveBeenCalledWith('r1', {
        objective: 'reach 20% growth',
      });
      expect(r).toEqual({ goal_id: 'g1', status: 'active' });
    });

    it('should propagate HttpException from createGoal on vibe 5xx', async () => {
      (vibe.createGoal as jest.Mock).mockRejectedValue(
        new HttpException('upstream 502', 502),
      );
      await expect(
        ctrl.createGoal({ id: 'u1' } as any, 's1', { objective: 'x' } as any),
      ).rejects.toBeInstanceOf(HttpException);
    });

    // ---- getGoal ----
    it('should call getGoal on GET /sessions/:id/goal and wrap data when null', async () => {
      (vibe.getGoal as jest.Mock).mockResolvedValue({
        goal_id: 'g1',
        status: 'active',
      });
      const r = await ctrl.getGoal({ id: 'u1' } as any, 's1');
      expect(svc.getSession).toHaveBeenCalledWith('u1', 's1');
      expect(vibe.getGoal).toHaveBeenCalledWith('r1');
      expect(r).toEqual({
        data: { goal_id: 'g1', status: 'active' },
      });
    });

    it('should return {data: null} from getGoal when vibe returns null', async () => {
      (vibe.getGoal as jest.Mock).mockResolvedValue(null);
      const r = await ctrl.getGoal({ id: 'u1' } as any, 's1');
      expect(r).toEqual({ data: null });
    });

    // ---- updateGoal ----
    it('should call updateGoal on PATCH /sessions/:id/goal and pass through', async () => {
      (vibe.updateGoal as jest.Mock).mockResolvedValue({
        goal_id: 'g1',
        status: 'updated',
      });
      const r = await ctrl.updateGoal({ id: 'u1' } as any, 's1', {
        goal_id: 'g1',
        expected_goal_id: 'g1',
      } as any);
      expect(svc.getSession).toHaveBeenCalledWith('u1', 's1');
      expect(vibe.updateGoal).toHaveBeenCalledWith('r1', {
        goal_id: 'g1',
        expected_goal_id: 'g1',
      });
      expect(r).toEqual({ goal_id: 'g1', status: 'updated' });
    });

    // ---- addGoalEvidence ----
    it('should call addGoalEvidence on POST /sessions/:id/goal/evidence and pass through', async () => {
      (vibe.addGoalEvidence as jest.Mock).mockResolvedValue({
        status: 'accepted',
      });
      const r = await ctrl.addGoalEvidence({ id: 'u1' } as any, 's1', {
        goal_id: 'g1',
        expected_goal_id: 'g1',
        text: 'evidence',
      } as any);
      expect(svc.getSession).toHaveBeenCalledWith('u1', 's1');
      expect(vibe.addGoalEvidence).toHaveBeenCalledWith('r1', {
        goal_id: 'g1',
        expected_goal_id: 'g1',
        text: 'evidence',
      });
      expect(r).toEqual({ status: 'accepted' });
    });

    // ---- updateGoalStatus ----
    it('should call updateGoalStatus on PATCH /sessions/:id/goal/status and pass through', async () => {
      (vibe.updateGoalStatus as jest.Mock).mockResolvedValue({
        status: 'achieved',
      });
      const r = await ctrl.updateGoalStatus({ id: 'u1' } as any, 's1', {
        goal_id: 'g1',
        expected_goal_id: 'g1',
        status: 'achieved',
      } as any);
      expect(svc.getSession).toHaveBeenCalledWith('u1', 's1');
      expect(vibe.updateGoalStatus).toHaveBeenCalledWith('r1', {
        goal_id: 'g1',
        expected_goal_id: 'g1',
        status: 'achieved',
      });
      expect(r).toEqual({ status: 'achieved' });
    });

    // ---- createSwarmRun ----
    it('should call createSwarmRun on POST /swarm/runs and return {id,status,preset_name}', async () => {
      (vibe.createSwarmRun as jest.Mock).mockResolvedValue({
        id: 'run-1',
        status: 'queued',
        preset_name: 'momentum',
      });
      const r = await ctrl.createSwarmRun({
        preset_name: 'momentum',
        user_vars: { universe: 'US' },
      } as any);
      expect(vibe.createSwarmRun).toHaveBeenCalledWith('momentum', {
        universe: 'US',
      });
      expect(r).toEqual({
        id: 'run-1',
        status: 'queued',
        preset_name: 'momentum',
      });
    });

    // ---- listSwarmRuns ----
    it('should call listSwarmRuns on GET /swarm/runs with default limit 20', async () => {
      (vibe.listSwarmRuns as jest.Mock).mockResolvedValue([{ id: 'run-1' }]);
      const r = await ctrl.listSwarmRuns(undefined);
      expect(vibe.listSwarmRuns).toHaveBeenCalledWith(20);
      expect(r).toEqual([{ id: 'run-1' }]);
    });

    it('should clamp listSwarmRuns limit into [1,100]', async () => {
      (vibe.listSwarmRuns as jest.Mock).mockResolvedValue([]);
      await ctrl.listSwarmRuns('5');
      expect(vibe.listSwarmRuns).toHaveBeenCalledWith(5);
      await ctrl.listSwarmRuns('500');
      expect(vibe.listSwarmRuns).toHaveBeenLastCalledWith(100);
      await ctrl.listSwarmRuns('0');
      expect(vibe.listSwarmRuns).toHaveBeenLastCalledWith(1);
    });

    // ---- getSwarmRun ----
    it('should call getSwarmRun on GET /swarm/runs/:id', async () => {
      (vibe.getSwarmRun as jest.Mock).mockResolvedValue({
        id: 'run-1',
        status: 'queued',
        preset_name: 'momentum',
      });
      const r = await ctrl.getSwarmRun('run-1');
      expect(vibe.getSwarmRun).toHaveBeenCalledWith('run-1');
      expect(r).toEqual({
        id: 'run-1',
        status: 'queued',
        preset_name: 'momentum',
      });
    });

    // ---- cancelSwarmRun ----
    it('should call cancelSwarmRun on POST /swarm/runs/:id/cancel', async () => {
      (vibe.cancelSwarmRun as jest.Mock).mockResolvedValue({
        status: 'cancelled',
      });
      const r = await ctrl.cancelSwarmRun('run-1');
      expect(vibe.cancelSwarmRun).toHaveBeenCalledWith('run-1');
      expect(r).toEqual({ status: 'cancelled' });
    });

    // ---- retrySwarmRun ----
    it('should call retrySwarmRun on POST /swarm/runs/:id/retry', async () => {
      (vibe.retrySwarmRun as jest.Mock).mockResolvedValue({
        id: 'run-2',
        status: 'queued',
        preset_name: 'momentum',
      });
      const r = await ctrl.retrySwarmRun('run-1');
      expect(vibe.retrySwarmRun).toHaveBeenCalledWith('run-1');
      expect(r).toEqual({
        id: 'run-2',
        status: 'queued',
        preset_name: 'momentum',
      });
    });
  });

  // ---- public presets endpoint (no JWT) ----
  describe('GET /swarm/presets (public)', () => {
    it('should call listSwarmPresets and return the array', async () => {
      (vibe.listSwarmPresets as jest.Mock).mockResolvedValue([
        { name: 'momentum', label: 'Momentum' },
      ]);
      const r = await ctrl.listSwarmPresets();
      expect(vibe.listSwarmPresets).toHaveBeenCalled();
      expect(r).toEqual([{ name: 'momentum', label: 'Momentum' }]);
    });

    it('should propagate HttpException from listSwarmPresets on vibe 5xx', async () => {
      (vibe.listSwarmPresets as jest.Mock).mockRejectedValue(
        new HttpException('upstream 502', 502),
      );
      await expect(ctrl.listSwarmPresets()).rejects.toBeInstanceOf(
        HttpException,
      );
    });
  });
});
