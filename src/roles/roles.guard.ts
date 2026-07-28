import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Repository, In } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { RoleEntity } from './infrastructure/persistence/relational/entities/role.entity';
import { UserRoleRepository } from '../users/infrastructure/persistence/user-role.repository';

/**
 * `@Roles()` decorator accepts either role ids (legacy) or role codes.
 *
 * We translate either form into a single `code` match against the
 * user's authoritative role set (legacy `user.roleId` plus the
 * `user_roles` junction table). This keeps the decorator API stable
 * while moving identification under the hood from numeric ids to
 * stable string codes.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
    private readonly userRoleRepository: UserRoleRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<(number | string)[]>(
      'roles',
      [context.getClass(), context.getHandler()],
    );
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) return false;

    // Collect all role ids the user holds.
    const userRoleIds = new Set<number>();
    if (user.role?.id) userRoleIds.add(Number(user.role.id));
    const junctionRoles = await this.userRoleRepository.findByUserId(
      Number(user.id),
    );
    for (const r of junctionRoles) userRoleIds.add(Number(r.roleId));

    if (userRoleIds.size === 0) return false;

    const userRoles = await this.roleRepository.find({
      where: { id: In([...userRoleIds]) },
    });
    const userCodes = new Set(userRoles.map((r) => r.code ?? ''));

    // Resolve required (numbers or codes) into codes.
    const numericRequired = required
      .filter((r) => /^\d+$/.test(String(r)))
      .map(Number);
    let requiredCodes: string[];
    if (numericRequired.length === required.length) {
      // All numeric → look up codes
      const looked = await this.roleRepository.find({
        where: { id: In(numericRequired) },
      });
      requiredCodes = looked.map((r) => r.code ?? '').filter(Boolean);
    } else {
      requiredCodes = required.map(String);
    }

    return requiredCodes.some((c) => userCodes.has(c));
  }
}
