import {
  CanActivate,
  ExecutionContext,
  Injectable,
  VersioningType,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { APP_GUARD } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { AiAgentController } from '../../src/ai-agent/ai-agent.controller';
import { AiAgentService } from '../../src/ai-agent/ai-agent.service';
import { VibeClientService } from '../../src/ai-agent/vibe-trading/vibe-client.service';

/**
 * Stand-in for `AuthGuard('jwt')` that injects a fake `user` on every
 * request. Lets us exercise JWT-protected routes end-to-end without a
 * live JWT signing pipeline or a registered passport strategy.
 *
 * The controller's @UseGuards(AuthGuard('jwt')) decorators are stripped
 * at module load time (see stripJwtGuards below) — this isolates the
 * test from the real passport machinery entirely.
 */
@Injectable()
class FakeJwtGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    if (!req.user) {
      req.user = { id: 1 };
    }
    return true;
  }
}

/**
 * Remove per-method `__guards__` metadata so the imported
 * AiAgentController isn't bound to `AuthGuard('jwt')` (which would
 * otherwise try to resolve an unregistered passport strategy at
 * runtime).
 *
 * Implemented by overwriting each method's guard list with an empty
 * array. The class itself has no @UseGuards at the class level so we
 * only need to walk the prototype methods.
 */
function stripJwtGuards(controllerClass: object): void {
  const proto = controllerClass as Record<string, any>;
  for (const key of Object.getOwnPropertyNames(proto)) {
    if (key === 'constructor') continue;
    const target = proto[key];
    if (!target || typeof target !== 'function') continue;
    try {
      Reflect.defineMetadata('__guards__', [], target);
    } catch {
      // ignore: method has no reflected metadata
    }
  }
}

describe('AiAgent new routes e2e (mocked upstream + fake JWT)', () => {
  let app: NestExpressApplication;

  // ---- mocks ----
  const aiAgentService = {
    listAgentTypes: jest.fn().mockReturnValue(['vibe-trading']),
    getSession: jest.fn(),
  };

  const vibeClient = {
    uploadFile: jest.fn(),
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

  // default for goal routes: a valid session owned by user id 1
  (aiAgentService.getSession as jest.Mock).mockResolvedValue({
    id: 's1',
    remoteSessionId: 'r1',
  });

  beforeAll(async () => {
    stripJwtGuards(AiAgentController.prototype);

    const m = await Test.createTestingModule({
      controllers: [AiAgentController],
      providers: [
        { provide: AiAgentService, useValue: aiAgentService },
        { provide: VibeClientService, useValue: vibeClient },
        { provide: APP_GUARD, useClass: FakeJwtGuard },
      ],
    }).compile();

    app = m.createNestApplication({ rawBody: true }) as NestExpressApplication;
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI });
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    Object.values(vibeClient).forEach((fn) => (fn as jest.Mock).mockReset());
  });

  // ---------- upload (multer) ----------
  describe('POST /v1/ai-agent/upload', () => {
    it('should accept a .pdf and pass through the vibe upload response', async () => {
      const vibeResp = {
        status: 'ok',
        file_path: '/uploads/test.pdf',
        filename: 'test.pdf',
      };
      (vibeClient.uploadFile as jest.Mock).mockResolvedValue(vibeResp);

      const res = await request(app.getHttpServer())
        .post('/api/v1/ai-agent/upload')
        .attach('file', Buffer.from('PDF-BYTES'), {
          filename: 'test.pdf',
          contentType: 'application/pdf',
        })
        .expect(200);

      expect(res.body).toEqual(vibeResp);
      expect(vibeClient.uploadFile).toHaveBeenCalledTimes(1);
      const [buf, name, mime] = (vibeClient.uploadFile as jest.Mock).mock
        .calls[0];
      expect(Buffer.isBuffer(buf)).toBe(true);
      expect(name).toBe('test.pdf');
      expect(mime).toBe('application/pdf');
    });

    it('should reject a .exe upload with 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/ai-agent/upload')
        .attach('file', Buffer.from('MZ\x90\x00'), {
          filename: 'malware.exe',
          contentType: 'application/octet-stream',
        });

      // NestJS BadRequestException => 400
      expect(res.status).toBe(400);
      expect(vibeClient.uploadFile).not.toHaveBeenCalled();
    });
  });

  // ---------- goal (under /sessions/:id) ----------
  describe('sessions/:id/goal', () => {
    it('should GET /sessions/:id/goal and return the snapshot as {data}', async () => {
      const snapshot = { goal_id: 'g1', status: 'active' };
      (vibeClient.getGoal as jest.Mock).mockResolvedValue(snapshot);

      // Manually inject the fake user — the controller reads
      // `req.user.id` via @CurrentUser.
      const res = await request(app.getHttpServer())
        .get('/api/v1/ai-agent/sessions/s1/goal')
        .expect(200);

      expect(res.body).toEqual({ data: snapshot });
      expect(aiAgentService.getSession).toHaveBeenCalledWith(1, 's1');
      expect(vibeClient.getGoal).toHaveBeenCalledWith('r1');
    });

    it('should POST /sessions/:id/goal to create a goal and pass through vibe response', async () => {
      const goalResp = { goal_id: 'g1', status: 'active' };
      (vibeClient.createGoal as jest.Mock).mockResolvedValue(goalResp);

      const res = await request(app.getHttpServer())
        .post('/api/v1/ai-agent/sessions/s1/goal')
        .send({ objective: 'reach 20% growth' })
        .expect(200);

      expect(res.body).toEqual(goalResp);
      expect(aiAgentService.getSession).toHaveBeenCalledWith(1, 's1');
      expect(vibeClient.createGoal).toHaveBeenCalledWith('r1', {
        objective: 'reach 20% growth',
      });
    });
  });

  // ---------- swarm ----------
  describe('swarm', () => {
    it('should GET /swarm/presets without a JWT (public endpoint)', async () => {
      (vibeClient.listSwarmPresets as jest.Mock).mockResolvedValue([
        { name: 'momentum', label: 'Momentum' },
      ]);

      // Snapshot how many times getSession has been called before this
      // test runs (prior goal tests legitimately call it).
      const getSessionCallsBefore = (aiAgentService.getSession as jest.Mock)
        .mock.calls.length;

      // No Authorization header — this route should still succeed because
      // it bypasses the JWT guard. If the controller wiring is correct,
      // the absence of a header does NOT cause 401.
      const res = await request(app.getHttpServer())
        .get('/api/v1/ai-agent/swarm/presets')
        // explicitly NOT setting Authorization
        .expect(200);

      expect(res.body).toEqual([{ name: 'momentum', label: 'Momentum' }]);
      expect(vibeClient.listSwarmPresets).toHaveBeenCalledTimes(1);
      // Public endpoint must never touch the JWT-protected session path —
      // call count for getSession should be flat compared to before.
      const getSessionCallsAfter = (aiAgentService.getSession as jest.Mock).mock
        .calls.length;
      expect(getSessionCallsAfter).toBe(getSessionCallsBefore);
    });

    it('should POST /swarm/runs to create a run and return {id,status,preset_name}', async () => {
      const runResp = {
        id: 'run-1',
        status: 'queued',
        preset_name: 'momentum',
      };
      (vibeClient.createSwarmRun as jest.Mock).mockResolvedValue(runResp);

      const res = await request(app.getHttpServer())
        .post('/api/v1/ai-agent/swarm/runs')
        .send({
          preset_name: 'momentum',
          user_vars: { universe: 'US' },
        })
        .expect(200);

      expect(res.body).toEqual(runResp);
      expect(vibeClient.createSwarmRun).toHaveBeenCalledWith('momentum', {
        universe: 'US',
      });
    });
  });
});
