import { ForbiddenException } from '@nestjs/common';
import {
  assertCanUpdateSkill,
  assertCanArchiveOrRestore,
} from './skill-access';

const makeSkill = (overrides: Partial<any> = {}) => ({
  id: 's1',
  uploaderType: 'platform',
  uploaderId: 7,
  status: 'published',
  ...overrides,
});

describe('assertCanUpdateSkill', () => {
  it('should allow super_admin to update any skill', () => {
    const role = assertCanUpdateSkill(
      makeSkill({ uploaderType: 'platform' }) as any,
      99,
      { isSuperAdmin: true, isAdmin: true },
    );
    expect(role).toBe('super_admin');
  });

  it('should allow admin to update platform/third_party skills', () => {
    const role = assertCanUpdateSkill(
      makeSkill({ uploaderType: 'platform' }) as any,
      2,
      { isSuperAdmin: false, isAdmin: true },
    );
    expect(role).toBe('admin');
  });

  it('should deny admin to update user_self skill', () => {
    expect(() =>
      assertCanUpdateSkill(
        makeSkill({ uploaderType: 'user_self', uploaderId: 42 }) as any,
        2,
        { isSuperAdmin: false, isAdmin: true },
      ),
    ).toThrow(ForbiddenException);
  });

  it('should allow user_self author to update their own skill', () => {
    const role = assertCanUpdateSkill(
      makeSkill({ uploaderType: 'user_self', uploaderId: 42 }) as any,
      42,
      { isSuperAdmin: false, isAdmin: false },
    );
    expect(role).toBe('self');
  });

  it('should deny non-author non-admin', () => {
    expect(() =>
      assertCanUpdateSkill(
        makeSkill({ uploaderType: 'user_self', uploaderId: 42 }) as any,
        99,
        { isSuperAdmin: false, isAdmin: false },
      ),
    ).toThrow(ForbiddenException);
  });

  it('should deny plain user updating platform skill', () => {
    expect(() =>
      assertCanUpdateSkill(makeSkill({ uploaderType: 'platform' }) as any, 99, {
        isSuperAdmin: false,
        isAdmin: false,
      }),
    ).toThrow(ForbiddenException);
  });
});

describe('assertCanArchiveOrRestore', () => {
  it('should allow super_admin', () => {
    expect(
      assertCanArchiveOrRestore(makeSkill() as any, {
        isSuperAdmin: true,
        isAdmin: true,
      }),
    ).toBe('super_admin');
  });

  it('should allow admin', () => {
    expect(
      assertCanArchiveOrRestore(makeSkill() as any, {
        isSuperAdmin: false,
        isAdmin: true,
      }),
    ).toBe('admin');
  });

  it('should deny plain user', () => {
    expect(() =>
      assertCanArchiveOrRestore(makeSkill() as any, {
        isSuperAdmin: false,
        isAdmin: false,
      }),
    ).toThrow(ForbiddenException);
  });
});
