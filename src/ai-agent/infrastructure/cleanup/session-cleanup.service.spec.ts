import { SessionCleanupService } from './session-cleanup.service';

describe('SessionCleanupService', () => {
  const repo = {
    findExpiredForCleanup: jest
      .fn()
      .mockResolvedValue([{ id: 'a' }, { id: 'b' }]),
    softDeleteById: jest.fn().mockResolvedValue(undefined),
  };
  const cfg = {
    get: (path: string) => {
      if (path === 'aiAgent.ttlGraceDays') return 7;
      return undefined;
    },
  };
  const svc = new SessionCleanupService(repo as any, cfg as any);

  it('should soft-delete expired sessions', async () => {
    await svc.runOnce(new Date('2026-08-06T03:00:00Z'));
    expect(repo.softDeleteById).toHaveBeenCalledTimes(2);
    expect(repo.softDeleteById).toHaveBeenCalledWith('a');
  });

  it('should compute grace cutoff using config', async () => {
    const now = new Date('2026-08-06T00:00:00Z');
    await svc.runOnce(now);
    const expected = new Date(now.getTime() - 7 * 86400_000);
    expect(repo.findExpiredForCleanup).toHaveBeenCalledWith(now, expected);
  });
});
