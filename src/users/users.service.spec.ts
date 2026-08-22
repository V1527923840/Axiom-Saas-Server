import { UsersService } from './users.service';

describe('UsersService.isAdmin', () => {
  let svc: UsersService;
  let isSuperAdminSpy: jest.SpyInstance;

  beforeEach(() => {
    isSuperAdminSpy = jest.spyOn(UsersService.prototype, 'isSuperAdmin');
    svc = Object.create(UsersService.prototype);
  });

  it('should return true when isSuperAdmin returns true', async () => {
    isSuperAdminSpy.mockResolvedValue(true);
    await expect(svc.isAdmin(1)).resolves.toBe(true);
  });

  it('should check admin role code via repositories when not super admin', async () => {
    isSuperAdminSpy.mockResolvedValue(false);
    // stub the internal repositories; full DI wiring is overkill for this test
    (svc as any).usersRepository = {
      findById: jest.fn().mockResolvedValue({ id: 1, role: { id: 2 } }),
    };
    (svc as any).userRoleRepository = {
      findByUserId: jest.fn().mockResolvedValue([]),
    };
    (svc as any).usersServiceRoleRepository = {
      find: jest.fn().mockResolvedValue([{ code: 'admin' }]),
    };
    await expect(svc.isAdmin(1)).resolves.toBe(true);
  });

  it('should return false when user has no admin role', async () => {
    isSuperAdminSpy.mockResolvedValue(false);
    (svc as any).usersRepository = {
      findById: jest.fn().mockResolvedValue({ id: 1, role: { id: 5 } }),
    };
    (svc as any).userRoleRepository = {
      findByUserId: jest.fn().mockResolvedValue([]),
    };
    (svc as any).usersServiceRoleRepository = {
      find: jest.fn().mockResolvedValue([{ code: 'analyst' }]),
    };
    await expect(svc.isAdmin(1)).resolves.toBe(false);
  });
});
