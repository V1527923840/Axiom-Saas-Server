import { ConcurrencyService } from './concurrency.service';

describe('ConcurrencyService', () => {
  const repo = {
    tryAcquireInflight: jest.fn(),
    releaseInflight: jest.fn(),
  };
  const svc = new ConcurrencyService(repo as any);

  it('should throw 409 when acquire fails', async () => {
    repo.tryAcquireInflight.mockResolvedValue(false);
    await expect(svc.acquire('sid')).rejects.toMatchObject({ status: 409 });
  });

  it('should resolve when acquire succeeds', async () => {
    repo.tryAcquireInflight.mockResolvedValue(true);
    await expect(svc.acquire('sid')).resolves.toBeUndefined();
  });

  it('should call releaseInflight', async () => {
    await svc.release('sid');
    expect(repo.releaseInflight).toHaveBeenCalledWith('sid');
  });
});
