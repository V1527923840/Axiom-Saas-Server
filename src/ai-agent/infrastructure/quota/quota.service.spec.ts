import { QuotaService } from './quota.service';

describe('QuotaService', () => {
  const repo = { incrementQuotaIfToday: jest.fn() };
  const cfg = {
    get: (path: string) => {
      if (path === 'aiAgent.dailyQuota') return 3;
      return undefined;
    },
  };
  const svc = new QuotaService(repo as any, cfg as any);

  it('should throw 429 when quota exceeded', async () => {
    repo.incrementQuotaIfToday.mockResolvedValue(99);
    await expect(svc.checkAndIncrement('sid')).rejects.toMatchObject({
      status: 429,
    });
  });

  it('should pass when under quota', async () => {
    repo.incrementQuotaIfToday.mockResolvedValue(1);
    await expect(svc.checkAndIncrement('sid')).resolves.toBeUndefined();
  });
});
