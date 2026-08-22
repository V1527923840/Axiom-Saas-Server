import { ForbiddenException } from '@nestjs/common';
import { SkillEntity } from './infrastructure/persistence/relational/entities/skill.entity';

export interface RoleFlags {
  isSuperAdmin: boolean;
  isAdmin: boolean;
}

export type ActorRole = 'self' | 'admin' | 'super_admin';

/**
 * Authorize a skill update. Returns the actor role for event-log audit.
 *
 * Rules (spec §3.3):
 *   - super_admin → any skill
 *   - admin (role.code in {admin, super_admin}) → platform / third_party only
 *   - user_self author (skill.uploaderId === userId) → own skill
 *
 * Throws ForbiddenException on deny.
 */
export function assertCanUpdateSkill(
  skill: SkillEntity,
  userId: number,
  flags: RoleFlags,
): ActorRole {
  if (flags.isSuperAdmin) return 'super_admin';

  if (flags.isAdmin && skill.uploaderType !== 'user_self') {
    return 'admin';
  }

  if (skill.uploaderType === 'user_self' && skill.uploaderId === userId) {
    return 'self';
  }

  throw new ForbiddenException(
    `not allowed to update skill ${skill.id} (uploaderType=${skill.uploaderType}, uploaderId=${skill.uploaderId})`,
  );
}

/**
 * Authorize skill archive/restore. Admin-only by design.
 * Returns actor role for event-log audit.
 */
export function assertCanArchiveOrRestore(
  skill: SkillEntity,
  flags: RoleFlags,
): 'admin' | 'super_admin' {
  if (flags.isSuperAdmin) return 'super_admin';
  if (flags.isAdmin) return 'admin';

  throw new ForbiddenException(
    `only admin can archive/restore skill ${skill.id}`,
  );
}
