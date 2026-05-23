import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UsersService } from '../users/users.service';
import { Menu } from './domain/menu';

@Injectable()
export class MenuAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly usersService: UsersService,
  ) {}

  private flattenMenuTree(menus: Menu[]): string[] {
    const paths: string[] = [];

    const traverse = (menu: Menu) => {
      if (menu.path) {
        paths.push(menu.path);
      }
      if (menu.children && menu.children.length > 0) {
        menu.children.forEach(traverse);
      }
    };

    menus.forEach(traverse);
    return paths;
  }

  /**
   * Derives menu path from route pattern.
   * E.g., GET /api/v1/plans → /plans, GET /api/v1/plans/:id → /plans
   */
  private deriveMenuPathFromRoute(context: ExecutionContext): string | null {
    const request = context.switchToHttp().getRequest();
    const routePath = request.route?.pattern || request.url;

    // Remove /api/v1 prefix and trailing params like /:id
    let menuPath = routePath
      .replace(/^\/api\/v1/, '')
      .replace(/\/:[^/]+$/, '')
      .replace(/\?.*$/, '');

    // Remove trailing slashes
    menuPath = menuPath.replace(/\/+$/, '');

    // If empty, couldn't derive
    if (!menuPath) {
      return null;
    }

    return menuPath;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Must be authenticated first
    if (!user || !user.id) {
      throw new UnauthorizedException('Authentication required');
    }

    // Admin (role.id === 1) has unrestricted access
    if (user?.role?.id === 1) {
      return true;
    }

    // Get explicitly set menu paths from decorator
    const explicitMenuPaths = this.reflector.getAllAndOverride<string[]>(
      'menuPaths',
      [context.getClass(), context.getHandler()],
    );

    // Determine which menu paths to check
    let menuPathsToCheck: string[] = [];

    if (explicitMenuPaths && explicitMenuPaths.length > 0) {
      // Use explicitly defined paths
      menuPathsToCheck = explicitMenuPaths;
    } else {
      // Auto-derive from route pattern
      const derivedPath = this.deriveMenuPathFromRoute(context);
      if (derivedPath) {
        menuPathsToCheck = [derivedPath];
      }
      // If no path could be derived, allow access (no menu protection)
    }

    // If no menu paths to check, allow access
    if (menuPathsToCheck.length === 0) {
      return true;
    }

    // Get all menus for user
    const userMenus = await this.usersService.getUserAllMenus(user.id);
    const userMenuPaths = this.flattenMenuTree(userMenus);

    console.log('[MenuAccessGuard] Checking access:', {
      menuPathsToCheck,
      userMenuPaths,
      userId: user.id,
      userRoleId: user.role?.id,
    });

    // Check if user has access to any of the required menu paths
    // Support sub-path matching: /versions matches /versions/sources
    const hasAccess = menuPathsToCheck.some((requiredPath) =>
      userMenuPaths.some(
        (userPath) =>
          userPath === requiredPath ||
          requiredPath.startsWith(userPath + '/') ||
          userPath.startsWith(requiredPath + '/'),
      ),
    );

    if (!hasAccess) {
      console.log(
        '[MenuAccessGuard] Access denied for paths:',
        menuPathsToCheck,
      );
      throw new ForbiddenException('You do not have access to this resource');
    }

    return true;
  }
}
