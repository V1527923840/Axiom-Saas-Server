import { ConfigService } from '@nestjs/config';
import { ServiceTokenGuard } from './service-token.guard';

describe('ServiceTokenGuard', () => {
  let guard: ServiceTokenGuard;

  beforeEach(() => {
    const stub: any = {
      get: (k: string) => (k === 'skill.serviceToken' ? 'secret' : null),
    };
    guard = new ServiceTokenGuard(stub as ConfigService);
  });

  it('should pass with valid token', () => {
    const ctx: any = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: { authorization: 'Bearer secret' } }),
      }),
    };
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should reject invalid token', () => {
    const ctx: any = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: { authorization: 'Bearer wrong' } }),
      }),
    };
    expect(() => guard.canActivate(ctx)).toThrow(/invalid/);
  });

  it('should reject missing token', () => {
    const ctx: any = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: {} }),
      }),
    };
    expect(() => guard.canActivate(ctx)).toThrow(/invalid/);
  });
});
