import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { InternalUserSkillController } from './internal-user-skill.controller';
import { InternalSkillToolService } from './internal-skill-tool.service';
import { ServiceTokenGuard } from './service-token.guard';
import { ConfigService } from '@nestjs/config';
import {
  ExecutionContext,
  UnauthorizedException as NestUnauthorized,
} from '@nestjs/common';
import { SkillRepository } from './infrastructure/persistence/relational/repositories/skill.repository';
import { SkillFileRepository } from './infrastructure/persistence/relational/repositories/skill-file.repository';
import { UserSkillBindingRepository } from './infrastructure/persistence/relational/repositories/user-skill-binding.repository';
import { SkillStorageService } from './infrastructure/storage/skill-storage.service';
import { ToolEndpointWhitelist } from './tool-endpoint-whitelist';

/**
 * Spec for InternalUserSkillController.
 *
 * Coverage:
 *   - happy path: valid token + matching :uid / X-User-Id → 200 + list
 *   - bad service token → 401 (ServiceTokenGuard short-circuits)
 *   - X-User-Id mismatch → 403 (horizontal-authz defense)
 *   - missing X-User-Id → 403
 *   - empty binding → 200 + `{data: []}` (NOT 404)
 *   - non-numeric :uid → 403
 *
 * The ServiceTokenGuard is wired in two ways here:
 *   1) as a real instance driven by a fake ConfigService (proves the
 *      guard rejects bad tokens with 401), and
 *   2) mocked-out for the controller-only assertions (so we can
 *      exercise the SSRF defense and the empty-binding path without
 *      dragging the JWT shape into every test).
 */
describe('InternalUserSkillController', () => {
  let controller: InternalUserSkillController;
  let svc: jest.Mocked<InternalSkillToolService>;

  const ctx = (headers: Record<string, string>): ExecutionContext => {
    // Same request object reused across switchToHttp().getRequest() calls
    // so the guard's mutation (req.callerContext = ...) is observable
    // by the test after canActivate() returns.
    const request = { headers };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  };

  const req = (uid: string, headers: Record<string, string>): any => ({
    headers,
    callerContext: {
      userId: headers['x-user-id'],
      sessionId: headers['x-session-id'],
      attemptId: headers['x-attempt-id'],
    },
    // mimic the parsed :uid path param NestJS would attach
    params: { uid },
  });

  beforeEach(() => {
    svc = {
      listVisibleSkills: jest.fn(),
    } as unknown as jest.Mocked<InternalSkillToolService>;
    controller = new InternalUserSkillController(svc);
  });

  // ============================================================
  // Real ServiceTokenGuard behavior (bad token → 401)
  // ============================================================

  describe('ServiceTokenGuard integration', () => {
    const buildGuard = (token: string | undefined): ServiceTokenGuard => {
      const config = {
        get: (key: string) =>
          key === 'skill.serviceToken' ? token : undefined,
      } as unknown as ConfigService;
      return new ServiceTokenGuard(config);
    };

    it('should reject with 401 when service token is missing', () => {
      const guard = buildGuard('correct-token');
      expect(() => guard.canActivate(ctx({ 'x-user-id': '42' }))).toThrow(
        UnauthorizedException,
      );
    });

    it('should reject with 401 when service token does not match', () => {
      const guard = buildGuard('correct-token');
      expect(() =>
        guard.canActivate(
          ctx({ authorization: 'Bearer wrong-token', 'x-user-id': '42' }),
        ),
      ).toThrow(UnauthorizedException);
    });

    it('should accept a valid token and attach callerContext', () => {
      const guard = buildGuard('correct-token');
      const ec = ctx({
        authorization: 'Bearer correct-token',
        'x-user-id': '42',
        'x-session-id': 'sess-1',
        'x-attempt-id': 'att-1',
      });
      const ok = guard.canActivate(ec);
      expect(ok).toBe(true);
      const req = ec.switchToHttp().getRequest() as any;
      expect(req.callerContext).toEqual({
        userId: '42',
        sessionId: 'sess-1',
        attemptId: 'att-1',
      });
    });
  });

  // ============================================================
  // GET /internal/users/:uid/skills — happy path
  // ============================================================

  describe('listUserSkills', () => {
    const headers = {
      authorization: 'Bearer correct-token',
      'x-user-id': '42',
      'x-session-id': 'sess-1',
      'x-attempt-id': 'att-1',
    };

    it('should call service.listVisibleSkills and return {data} when caller matches', async () => {
      const summaries = [
        {
          id: 's1',
          name: 'Trading Principles',
          description: 'Core',
          category: 'trading',
          tags: ['finance'],
          contentHash: 'h'.repeat(64),
          toolsCount: 2,
          manifestTokenEstimate: 100,
          totalTokenEstimate: 500,
        },
      ];
      svc.listVisibleSkills.mockResolvedValue(summaries as any);

      const out = await controller.listUserSkills('42', req('42', headers));

      expect(svc.listVisibleSkills).toHaveBeenCalledWith(42);
      expect(out).toEqual({ data: summaries });
    });

    // ============================================================
    // Empty binding → 200 + empty array (NOT 404)
    // ============================================================

    it('should return {data: []} (NOT 404) when the user has no enabled bindings', async () => {
      svc.listVisibleSkills.mockResolvedValue([]);

      const out = await controller.listUserSkills('42', req('42', headers));

      expect(svc.listVisibleSkills).toHaveBeenCalledWith(42);
      expect(out).toEqual({ data: [] });
    });

    // ============================================================
    // SSRF / horizontal-authz defense
    // ============================================================

    it('should reject with 403 when :uid does not match X-User-Id header', async () => {
      await expect(
        controller.listUserSkills('99', req('99', headers)),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(svc.listVisibleSkills).not.toHaveBeenCalled();
    });

    it('should reject with 403 when X-User-Id header is missing', async () => {
      const noUserId = {
        authorization: 'Bearer correct-token',
      };
      await expect(
        controller.listUserSkills('42', req('42', noUserId)),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(svc.listVisibleSkills).not.toHaveBeenCalled();
    });

    it('should reject with 403 when callerContext is undefined (guard did not attach)', async () => {
      const malformed = { headers };
      await expect(
        controller.listUserSkills('42', malformed as any),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(svc.listVisibleSkills).not.toHaveBeenCalled();
    });

    // ============================================================
    // Path validation
    // ============================================================

    it('should reject with 403 when :uid is not numeric', async () => {
      await expect(
        controller.listUserSkills(
          'not-a-number',
          req('not-a-number', {
            ...headers,
            'x-user-id': 'not-a-number',
          }),
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      // Note: assertion order means we throw BEFORE coercing to number,
      // because the callerContext check runs first.
      expect(svc.listVisibleSkills).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // Real InternalSkillToolService filter test (audit I-3 invariant)
  // ============================================================
  //
  // When a user has an enabled binding that points at a draft or
  // archived skill, that skill MUST be filtered out of the response
  // — never returned, even though the binding is enabled. This
  // protects vibe's system-prompt injection from leaking unreleased
  // or retired skill metadata.

  describe('listVisibleSkills — status filter invariant (real service)', () => {
    let realSvc: InternalSkillToolService;
    let skillRepo: jest.Mocked<SkillRepository>;
    let fileRepo: jest.Mocked<SkillFileRepository>;
    let bindingRepo: jest.Mocked<UserSkillBindingRepository>;
    let storage: jest.Mocked<SkillStorageService>;
    let realController: InternalUserSkillController;

    const headers = {
      authorization: 'Bearer correct-token',
      'x-user-id': '42',
      'x-session-id': 'sess-1',
      'x-attempt-id': 'att-1',
    };

    beforeEach(() => {
      skillRepo = {
        findById: jest.fn(),
        findByIds: jest.fn(),
      } as unknown as jest.Mocked<SkillRepository>;
      fileRepo = {
        listIndexBySkill: jest.fn(),
        findOne: jest.fn(),
      } as unknown as jest.Mocked<SkillFileRepository>;
      bindingRepo = {
        findEnabledByUser: jest.fn(),
      } as unknown as jest.Mocked<UserSkillBindingRepository>;
      storage = {
        getObject: jest.fn(),
      } as unknown as jest.Mocked<SkillStorageService>;

      realSvc = new InternalSkillToolService(
        skillRepo,
        fileRepo,
        bindingRepo,
        storage,
        new ToolEndpointWhitelist(),
      );
      realController = new InternalUserSkillController(realSvc);
    });

    it('should filter out draft and archived skills from binding list', async () => {
      // (1) Mock bindings: user has enabled bindings to 3 skills
      //     (one published, one draft, one archived).
      bindingRepo.findEnabledByUser.mockResolvedValue([
        { userId: 42, skillId: 's-published', status: 'enabled' },
        { userId: 42, skillId: 's-draft', status: 'enabled' },
        { userId: 42, skillId: 's-archived', status: 'enabled' },
      ] as any);

      // (2) Mock skillRepo.findByIds returns the corresponding skill
      //     entities with mixed statuses.
      skillRepo.findByIds.mockResolvedValue([
        {
          id: 's-published',
          name: 'Published Skill',
          description: 'Live',
          category: 'trading',
          tags: ['finance'],
          status: 'published',
          contentHash: 'a'.repeat(64),
          tools: [{ name: 't1' }],
          manifestTokenEstimate: 100,
          totalTokenEstimate: 500,
        },
        {
          id: 's-draft',
          name: 'Draft Skill',
          description: 'WIP',
          category: 'trading',
          tags: null,
          status: 'draft',
          contentHash: null,
          tools: [],
          manifestTokenEstimate: null,
          totalTokenEstimate: null,
        },
        {
          id: 's-archived',
          name: 'Archived Skill',
          description: 'Retired',
          category: 'trading',
          tags: null,
          status: 'archived',
          contentHash: 'b'.repeat(64),
          tools: [],
          manifestTokenEstimate: null,
          totalTokenEstimate: null,
        },
      ] as any);

      const out = await realController.listUserSkills('42', req('42', headers));

      // (3) Assert: only the published skill is in the response.
      expect(out).toEqual({
        data: [
          {
            id: 's-published',
            name: 'Published Skill',
            description: 'Live',
            category: 'trading',
            tags: ['finance'],
            contentHash: 'a'.repeat(64),
            toolsCount: 1,
            manifestTokenEstimate: 100,
            totalTokenEstimate: 500,
          },
        ],
      });

      // Bindings were queried once for this user.
      expect(bindingRepo.findEnabledByUser).toHaveBeenCalledWith(42);
      // findByIds was called with all 3 unique ids (dedupe step).
      expect(skillRepo.findByIds).toHaveBeenCalledWith([
        's-published',
        's-draft',
        's-archived',
      ]);
    });
  });
});

// Re-export NestJS UnauthorizedException under a local alias so the test
// stays consistent with the module's existing pattern (see
// internal-skill.controller.spec.ts).
const _unused = NestUnauthorized;
void _unused;
