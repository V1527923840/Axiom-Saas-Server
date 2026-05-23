import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<(number | string)[]>(
      'roles',
      [context.getClass(), context.getHandler()],
    );
    if (!roles || !roles.length) {
      return true;
    }
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Check single role.id first (RoleEnum.admin = 1)
    const primaryRoleId = user?.role?.id;
    if (primaryRoleId && roles.map(String).includes(String(primaryRoleId))) {
      return true;
    }

    // Check roleIds array (from user_roles table)
    const roleIds = user?.roleIds as number[] | undefined;
    if (roleIds && roleIds.length > 0) {
      return roles.some((role) => roleIds.includes(Number(role)));
    }

    return false;
  }
}
