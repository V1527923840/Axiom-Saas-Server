import { Test } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
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
    uploadFile: jest.fn(),
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

    // Verify the method itself runs without invoking any JWT-protected
    // service (svc.getSession is the JWT-backed owner check). Since the
    // unit test instantiates the controller directly without any guard
    // middleware, we just assert that calling listSwarmPresets does not
    // touch the protected AiAgentService.
    it('should not invoke any JWT-protected service when called directly', async () => {
      (vibe.listSwarmPresets as jest.Mock).mockResolvedValue([]);
      await ctrl.listSwarmPresets();
      expect(svc.getSession).not.toHaveBeenCalled();
      expect(svc.createSession).not.toHaveBeenCalled();
      expect(svc.listSessions).not.toHaveBeenCalled();
    });
  });

  // ---------------- POST /upload (Task 3) ----------------

  describe('POST /upload', () => {
    const makeFile = (
      overrides: Partial<{
        originalname: string;
        size: number;
        mimetype: string;
      }> = {},
    ): Express.Multer.File => ({
      fieldname: 'file',
      originalname: 'doc.pdf',
      encoding: '7bit',
      mimetype: 'application/pdf',
      size: 1024,
      buffer: Buffer.from('test'),
      destination: '',
      filename: '',
      path: '',
      stream: undefined as any,
      ...overrides,
    });

    it('should pass through vibe uploadFile response for a valid .pdf', async () => {
      const vibeResp = {
        status: 'ok',
        file_path: '/uploads/x.pdf',
        filename: 'x.pdf',
      };
      (vibe.uploadFile as jest.Mock).mockResolvedValue(vibeResp);
      const r = await ctrl.uploadFile(makeFile({ originalname: 'doc.pdf' }));
      expect(vibe.uploadFile).toHaveBeenCalledWith(
        expect.any(Buffer),
        'doc.pdf',
        'application/pdf',
      );
      expect(r).toEqual(vibeResp);
    });

    // 回归:中文文件名必须保持原样传到 VibeTrading,不能被 Latin-1 化。
    //
    // 根因链路:浏览器 FormData 不在 multipart Content-Type 上声明 charset;
    // Multer 把 options.defParamCharset 透传给 busboy(multer/lib/make-middleware.js:27,131);
    // busboy 默认 defParamCharset = 'latin1' (busboy/lib/types/multipart.js:236-239)
    // → 中文 UTF-8 字节被当 Latin-1 单字节解读 → file.originalname 在 controller
    // 已经是乱码(如 `2-3 山东宏桥...pdf` → `2-3 ã±ã, ã°...`)→ 前端渲染乱码。
    //
    // 修复:FileInterceptor 加 defParamCharset: 'utf8'。本测试钉住 controller
    // 这一层不能再次引入 Latin-1 编码转换(例如不要写
    // `Buffer.from(file.originalname, 'latin1').toString('utf8')`)。
    it('should pass through Chinese filenames unchanged (no Latin-1 transcoding in controller)', async () => {
      const originalName =
        '2-3 山东宏桥新型材料有限公司2024年度经审计的合并及母公司财务报告.pdf';
      const vibeResp = {
        status: 'ok',
        file_path: 'uploads/abc.pdf',
        filename: originalName,
      };
      (vibe.uploadFile as jest.Mock).mockResolvedValue(vibeResp);
      const r = await ctrl.uploadFile(makeFile({ originalname: originalName }));
      expect(vibe.uploadFile).toHaveBeenCalledWith(
        expect.any(Buffer),
        originalName, // 必须严格相等,不允许任何编码转换
        'application/pdf',
      );
      // 返回值里的 filename 也必须保持中文 —— 这是前端 UI 渲染的字段。
      expect((r as any).filename).toBe(originalName);
    });

    it('should reject file exceeding 50MB', async () => {
      const big = makeFile({
        originalname: 'huge.pdf',
        size: 50 * 1024 * 1024 + 1,
      });
      await expect(ctrl.uploadFile(big)).rejects.toBeInstanceOf(HttpException);
      expect(vibe.uploadFile).not.toHaveBeenCalled();
    });

    it('should reject blocked extension .exe', async () => {
      const exe = makeFile({
        originalname: 'malware.exe',
        mimetype: 'application/octet-stream',
      });
      await expect(ctrl.uploadFile(exe)).rejects.toBeInstanceOf(HttpException);
      expect(vibe.uploadFile).not.toHaveBeenCalled();
    });

    it('should propagate HttpException from vibe on 5xx', async () => {
      (vibe.uploadFile as jest.Mock).mockRejectedValue(
        new HttpException('upstream 502', 502),
      );
      await expect(
        ctrl.uploadFile(makeFile({ originalname: 'doc.pdf' })),
      ).rejects.toBeInstanceOf(HttpException);
    });
  });

  // ---- guard metadata verification ----
  describe('JWT guard placement', () => {
    // Use Reflect to inspect which handlers carry the @UseGuards
    // metadata. The exact guard class is anonymous (AuthGuard('jwt')
    // returns an inner class with no .name), so we check that protected
    // routes have at least one guard entry, while `listSwarmPresets`
    // has none — proving it is the only public route.
    const protectedMethods = [
      'createGoal',
      'getGoal',
      'updateGoal',
      'addGoalEvidence',
      'updateGoalStatus',
      'createSwarmRun',
      'listSwarmRuns',
      'getSwarmRun',
      'cancelSwarmRun',
      'retrySwarmRun',
      'uploadFile',
    ];

    it.each(protectedMethods)(
      '%s should be decorated with @UseGuards',
      (methodName) => {
        const guards: any[] =
          Reflect.getMetadata(
            '__guards__',
            (AiAgentController.prototype as any)[methodName],
          ) ?? [];
        expect(guards.length).toBeGreaterThan(0);
      },
    );

    it('should NOT decorate listSwarmPresets with @UseGuards', () => {
      const guards: any[] =
        Reflect.getMetadata(
          '__guards__',
          AiAgentController.prototype.listSwarmPresets,
        ) ?? [];
      expect(guards.length).toBe(0);
    });
  });

  // ---------------- FileInterceptor defParamCharset pin ----------------
  //
  // 防止有人改回 Multer 默认(Latin-1)导致中文文件名乱码。
  // 真正验证需要 e2e 走完整 multipart pipeline,但单元层至少钉住
  // interceptor 类是被装饰的、options 字段被正确传入。
  describe('POST /upload FileInterceptor config', () => {
    it('should decorate uploadFile with @UseInterceptors', () => {
      const interceptors: any[] =
        Reflect.getMetadata(
          '__interceptors__',
          AiAgentController.prototype.uploadFile,
        ) ?? [];
      expect(interceptors.length).toBeGreaterThan(0);
    });

    // 防回归 pin:这段代码不应该被删除。
    // 在 NestJS 里 FileInterceptor 是匿名 mixin class,无法直接
    // 用 Reflect 读出 options.defParamCharset 字段;真正的 UTF-8
    // 解码验证需要 supertest 走完整 multipart pipeline
    // (参考 test/vibe-trading.e2e-spec.ts 的模式)。
    //
    // 这里我们用 `grep` 兜底:源码里必须出现 `defParamCharset: 'utf8'`
    // 这个字面量。如果有人不小心删了它(包括 PR 删 import 也算),
    // 这个测试会立刻 fail。
    it("should declare defParamCharset: 'utf8' in controller source", () => {
      const src = fs.readFileSync(
        path.join(__dirname, 'ai-agent.controller.ts'),
        'utf8',
      );
      expect(src).toContain("defParamCharset: 'utf8'");
    });
  });
});
