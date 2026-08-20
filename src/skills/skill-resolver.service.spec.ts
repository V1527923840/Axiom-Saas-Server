import { Logger } from '@nestjs/common';
import { SkillResolverService } from './skill-resolver.service';

/**
 * Spec for SkillResolverService — the most critical service in Skill Plaza.
 *
 * Required by spec §3.5.2: ALL 4 boundary cases must be tested here.
 * TypeORM mock pattern (per executor guide §5.1 — SQLite can't reproduce
 * Postgres features, so we use plain jest.fn() against repository methods).
 */
describe('SkillResolverService', () => {
  let resolver: SkillResolverService;
  let bindingRepo: any;
  let mountRepo: any;
  let skillRepo: any;

  beforeEach(() => {
    bindingRepo = {
      findEnabledByUser: jest.fn(),
    };
    mountRepo = {
      findBySession: jest.fn(),
    };
    skillRepo = {
      findByIds: jest.fn(),
    };

    resolver = new SkillResolverService(bindingRepo, mountRepo, skillRepo);

    // Silence Nest logger during tests.
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });

  /**
   * Helper: drive a resolve() call with explicit binding + mount + skill state.
   */
  function setup(params: {
    enabledSkillIds?: string[];
    mounts?: Array<{ skillId: string; op: 'add' | 'remove' }>;
    skills?: Array<{
      id: string;
      code?: string;
      name?: string;
      status: 'published' | 'draft' | 'archived';
    }>;
  }) {
    bindingRepo.findEnabledByUser.mockResolvedValue(
      (params.enabledSkillIds ?? []).map((skillId) => ({ skillId })),
    );
    mountRepo.findBySession.mockResolvedValue(params.mounts ?? []);
    // Default code/name to id-derived values so tests can assert on the
    // {id, code, name} shape without each test repeating the boilerplate.
    skillRepo.findByIds.mockResolvedValue(
      (params.skills ?? []).map((s) => ({
        code: s.code ?? `${s.id}-code`,
        name: s.name ?? `${s.id}-name`,
        ...s,
      })),
    );
  }

  // ===== Baseline behavior (no session mounts) =====

  it('should include newly-enabled skill X on next resolve (no mount)', async () => {
    // ★ Boundary case 1: user just enabled X, old session has no mount.
    setup({
      enabledSkillIds: ['s1', 'X'],
      mounts: [],
      skills: [
        { id: 's1', status: 'published' },
        { id: 'X', status: 'published' },
      ],
    });

    const result = await resolver.resolve(1, 'old-session-1');

    // Sort by raw Unicode code-point so test is locale-independent.
    expect([...result].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))).toEqual([
      { id: 'X', code: 'X-code', name: 'X-name' },
      { id: 's1', code: 's1-code', name: 's1-name' },
    ]);
  });

  it('should exclude newly-disabled skill X on next resolve (no mount)', async () => {
    // ★ Boundary case 2: user just disabled X (X not in bindings), no mount.
    setup({
      enabledSkillIds: ['s1'],
      mounts: [],
      skills: [{ id: 's1', status: 'published' }],
    });

    const result = await resolver.resolve(1, 'old-session-1');

    expect(result).toEqual([{ id: 's1', code: 's1-code', name: 's1-name' }]);
  });

  // ===== Delta overrides baseline =====

  it('should NOT include X even if newly-enabled, when old session has remove mount', async () => {
    // ★ Boundary case 3: user enabled X globally, but old session excludes X.
    setup({
      enabledSkillIds: ['X', 's1'],
      mounts: [{ skillId: 'X', op: 'remove' }],
      skills: [{ id: 's1', status: 'published' }],
    });

    const result = await resolver.resolve(1, 'old-session-1');

    expect(result).toEqual([{ id: 's1', code: 's1-code', name: 's1-name' }]);
  });

  it('should include X even if newly-disabled, when old session has add mount', async () => {
    // ★ Boundary case 4: user disabled X globally, but old session adds X.
    setup({
      enabledSkillIds: ['s1'],
      mounts: [{ skillId: 'X', op: 'add' }],
      skills: [
        { id: 'X', status: 'published' },
        { id: 's1', status: 'published' },
      ],
    });

    const result = await resolver.resolve(1, 'old-session-1');

    expect([...result].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))).toEqual([
      { id: 'X', code: 'X-code', name: 'X-name' },
      { id: 's1', code: 's1-code', name: 's1-name' },
    ]);
  });

  // ===== Additional confidence tests =====

  it('should return {id, code, name} (not strings, no version)', async () => {
    setup({
      enabledSkillIds: ['s1'],
      mounts: [],
      skills: [{ id: 's1', status: 'published' }],
    });

    const result = await resolver.resolve(1, 'session-1');

    expect(Array.isArray(result)).toBe(true);
    expect(result).toEqual([{ id: 's1', code: 's1-code', name: 's1-name' }]);
    // ★ Architectural invariant: never return {id, version}
    for (const item of result) {
      expect(typeof item).toBe('object');
      expect('version' in item).toBe(false);
    }
  });

  it('should filter out non-published skills (draft / archived)', async () => {
    setup({
      enabledSkillIds: ['s1', 's2', 's3'],
      mounts: [],
      skills: [
        { id: 's1', status: 'published' },
        { id: 's2', status: 'draft' },
        { id: 's3', status: 'archived' },
      ],
    });

    const result = await resolver.resolve(1, 'session-1');

    expect(result).toEqual([{ id: 's1', code: 's1-code', name: 's1-name' }]);
  });

  it('should return empty array when baseline is empty and no mounts', async () => {
    setup({ enabledSkillIds: [], mounts: [] });

    const result = await resolver.resolve(1, 'session-1');

    expect(result).toEqual([]);
    // No DB hits beyond the initial binding query.
    expect(skillRepo.findByIds).not.toHaveBeenCalled();
  });

  it('should be re-evaluated on each call (no caching)', async () => {
    // First call: only s1 enabled. Second call: s2 also enabled.
    bindingRepo.findEnabledByUser
      .mockResolvedValueOnce([{ skillId: 's1' }])
      .mockResolvedValueOnce([{ skillId: 's1' }, { skillId: 's2' }]);
    mountRepo.findBySession.mockResolvedValue([]);
    skillRepo.findByIds
      .mockResolvedValueOnce([
        { id: 's1', code: 's1-code', name: 's1-name', status: 'published' },
      ])
      .mockResolvedValueOnce([
        { id: 's1', code: 's1-code', name: 's1-name', status: 'published' },
        { id: 's2', code: 's2-code', name: 's2-name', status: 'published' },
      ]);

    const r1 = await resolver.resolve(1, 'sess-1');
    const r2 = await resolver.resolve(1, 'sess-1');

    expect(r1).toEqual([{ id: 's1', code: 's1-code', name: 's1-name' }]);
    expect([...r2].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))).toEqual([
      { id: 's1', code: 's1-code', name: 's1-name' },
      { id: 's2', code: 's2-code', name: 's2-name' },
    ]);
  });

  it('should fail soft to empty array on binding query failure', async () => {
    // ★ Spec §3.5.4 / §8.2: resolve failure must NOT block the chat.
    bindingRepo.findEnabledByUser.mockRejectedValue(new Error('DB down'));
    mountRepo.findBySession.mockResolvedValue([]);

    const result = await resolver.resolve(1, 'sess-1');

    expect(result).toEqual([]);
  });

  it('should fail soft to empty array on mount query failure', async () => {
    bindingRepo.findEnabledByUser.mockResolvedValue([]);
    mountRepo.findBySession.mockRejectedValue(new Error('mount query failed'));

    const result = await resolver.resolve(1, 'sess-1');

    expect(result).toEqual([]);
  });

  it('should fail soft to empty array on skillRepo.findByIds failure', async () => {
    bindingRepo.findEnabledByUser.mockResolvedValue([{ skillId: 's1' }]);
    mountRepo.findBySession.mockResolvedValue([]);
    skillRepo.findByIds.mockRejectedValue(new Error('skillRepo down'));

    const result = await resolver.resolve(1, 'sess-1');

    expect(result).toEqual([]);
  });

  it('should log a warn on resolve failure', async () => {
    // Spy BEFORE the failure-triggering call so we don't intercept prior calls.
    const warnSpy = jest.spyOn(Logger.prototype, 'warn');
    warnSpy.mockClear();
    bindingRepo.findEnabledByUser.mockRejectedValue(new Error('boom'));

    await resolver.resolve(2, 'sess-warn');

    expect(warnSpy).toHaveBeenCalled();
    expect(warnSpy.mock.calls[0][0]).toContain('boom');
  });
});
