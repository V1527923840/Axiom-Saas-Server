import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MenuEntity } from '../../../../menus/infrastructure/persistence/relational/entities/menu.entity';
import { RoleMenuEntity } from '../../../../menus/infrastructure/persistence/relational/entities/role-menu.entity';

interface MenuSeed {
  name: string;
  code: string;
  icon: string;
  path: string;
  parentId: string | null;
  sortOrder: number;
}

@Injectable()
export class MenuSeedService {
  constructor(
    @InjectRepository(MenuEntity)
    private readonly menuRepository: Repository<MenuEntity>,
    @InjectRepository(RoleMenuEntity)
    private readonly roleMenuRepository: Repository<RoleMenuEntity>,
  ) {}

  async run(): Promise<void> {
    const existingMenus = await this.menuRepository.count();
    if (existingMenus > 0) {
      return;
    }

    const menuSeeds: MenuSeed[] = [
      // Overview
      {
        name: '概览',
        code: 'overview',
        icon: 'LayoutDashboard',
        path: '/dashboard',
        parentId: null,
        sortOrder: 1,
      },
      {
        name: '仪表盘',
        code: 'dashboard',
        icon: 'LayoutDashboard',
        path: '/dashboard',
        parentId: null,
        sortOrder: 1,
      },

      // Content Management
      {
        name: '内容管理',
        code: 'content',
        icon: 'FileText',
        path: '/content',
        parentId: null,
        sortOrder: 2,
      },
      {
        name: '每日消息',
        code: 'daily-news',
        icon: 'FileText',
        path: '/content/daily-news',
        parentId: null,
        sortOrder: 1,
      },
      {
        name: '音频解读',
        code: 'audio-interpretation',
        icon: 'FileText',
        path: '/content/audio-interpretation',
        parentId: null,
        sortOrder: 2,
      },
      {
        name: '机构研报',
        code: 'institution-reports',
        icon: 'FileText',
        path: '/content/institution-reports',
        parentId: null,
        sortOrder: 3,
      },

      // User & Subscription
      {
        name: '用户与订阅',
        code: 'user-subscription',
        icon: 'Users',
        path: '/users',
        parentId: null,
        sortOrder: 3,
      },
      {
        name: '用户管理',
        code: 'users',
        icon: 'Users',
        path: '/users',
        parentId: null,
        sortOrder: 1,
      },
      {
        name: '套餐管理',
        code: 'plans',
        icon: 'CreditCard',
        path: '/plans',
        parentId: null,
        sortOrder: 2,
      },
      {
        name: '订阅管理',
        code: 'subscriptions',
        icon: 'Shield',
        path: '/subscriptions',
        parentId: null,
        sortOrder: 3,
      },

      // Bill Management
      {
        name: '账单管理',
        code: 'bill',
        icon: 'Wallet',
        path: '/bills',
        parentId: null,
        sortOrder: 4,
      },
      {
        name: '流水管理',
        code: 'flows',
        icon: 'ArrowLeftRight',
        path: '/bills/flows',
        parentId: null,
        sortOrder: 1,
      },
      {
        name: '消费管理',
        code: 'consumptions',
        icon: 'Receipt',
        path: '/bills/consumptions',
        parentId: null,
        sortOrder: 2,
      },

      // System
      {
        name: '系统',
        code: 'system',
        icon: 'Settings',
        path: '/system',
        parentId: null,
        sortOrder: 5,
      },
      {
        name: '菜单管理',
        code: 'menus',
        icon: 'Menu',
        path: '/menus',
        parentId: null,
        sortOrder: 1,
      },
      {
        name: '菜单分配',
        code: 'menu_assign',
        icon: 'Menu',
        path: '/menus/assign',
        parentId: null,
        sortOrder: 1,
      },
      {
        name: '设置',
        code: 'settings',
        icon: 'Settings',
        path: '/settings',
        parentId: null,
        sortOrder: 2,
      },
    ];

    // Create menus and collect them by code
    const menuMap = new Map<string, MenuEntity>();
    const parentMap = new Map<string, string>(); // code -> id

    for (const seed of menuSeeds) {
      // Check if menu with this code already exists
      const existing = await this.menuRepository.findOne({
        where: { code: seed.code },
      });
      if (existing) {
        parentMap.set(seed.code, existing.id);
        menuMap.set(seed.code, existing);
        continue;
      }

      const menu = this.menuRepository.create({
        name: seed.name,
        code: seed.code,
        icon: seed.icon,
        path: seed.path,
        parentId: seed.parentId,
        sortOrder: seed.sortOrder,
        status: 'active',
      });

      const saved = await this.menuRepository.save(menu);
      parentMap.set(seed.code, saved.id);
      menuMap.set(seed.code, saved);
    }

    // Now update parentId based on code relationship
    // For simplicity, we'll create a second pass to set parent relations
    // The seed data shows parent-child relationships by grouping
    const codeToParentCode: Record<string, string | null> = {
      dashboard: 'overview',
      'daily-news': 'content',
      'audio-interpretation': 'content',
      'institution-reports': 'content',
      users: 'user-subscription',
      plans: 'user-subscription',
      subscriptions: 'user-subscription',
      flows: 'bill',
      consumptions: 'bill',
      menus: 'system',
      menu_assign: 'system',
      settings: 'system',
    };

    // Update parentId for menus that have a parent
    for (const [code, parentCode] of Object.entries(codeToParentCode)) {
      if (parentCode && parentMap.has(code) && parentMap.has(parentCode)) {
        await this.menuRepository.update(
          { code },
          { parentId: parentMap.get(parentCode)! },
        );
      }
    }

    // Assign menus to roles
    await this.assignMenusToRoles(menuMap);
  }

  private async assignMenusToRoles(
    menuMap: Map<string, MenuEntity>,
  ): Promise<void> {
    // Super admin (id: 1) gets ALL menus including menus management
    const superAdminMenuIds = Array.from(menuMap.values()).map((m) => m.id);

    // Admin (id: 2) gets ALL menus including menus management
    // Admin automatically has all permissions, no need for manual assignment
    const adminMenuIds = Array.from(menuMap.values()).map((m) => m.id);

    // Assign to super_admin
    for (const menuId of superAdminMenuIds) {
      const existing = await this.roleMenuRepository.findOne({
        where: { roleId: 1, menuId },
      });
      if (!existing) {
        const roleMenu = this.roleMenuRepository.create({
          roleId: 1,
          menuId,
        });
        await this.roleMenuRepository.save(roleMenu);
      }
    }

    // Assign to admin
    for (const menuId of adminMenuIds) {
      const existing = await this.roleMenuRepository.findOne({
        where: { roleId: 2, menuId },
      });
      if (!existing) {
        const roleMenu = this.roleMenuRepository.create({
          roleId: 2,
          menuId,
        });
        await this.roleMenuRepository.save(roleMenu);
      }
    }
  }
}
