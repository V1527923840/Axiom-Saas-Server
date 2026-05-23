import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository, In } from 'typeorm';
import { MenuEntity } from '../entities/menu.entity';
import { RoleMenuEntity } from '../entities/role-menu.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { Menu } from '../../../../domain/menu';
import { MenuRepository } from '../../menu.repository';
import { MenuMapper } from '../mappers/menu.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class MenuRelationalRepository implements MenuRepository {
  constructor(
    @InjectRepository(MenuEntity)
    private readonly menuRepository: Repository<MenuEntity>,
    @InjectRepository(RoleMenuEntity)
    private readonly roleMenuRepository: Repository<RoleMenuEntity>,
  ) {}

  async create(
    data: Omit<Menu, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Menu> {
    const persistenceModel = MenuMapper.toPersistence(data);
    const newEntity = await this.menuRepository.save(
      this.menuRepository.create(persistenceModel),
    );
    return MenuMapper.toDomain(newEntity);
  }

  async findManyWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<{ data: Menu[]; total: number }> {
    const [entities, total] = await this.menuRepository.findAndCount({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
      order: { sortOrder: 'ASC' },
    });

    return {
      data: entities.map((entity) => MenuMapper.toDomain(entity)),
      total,
    };
  }

  async findAll(): Promise<Menu[]> {
    const entities = await this.menuRepository.find({
      order: { sortOrder: 'ASC' },
    });
    return entities.map((entity) => MenuMapper.toDomain(entity));
  }

  async findTree(): Promise<Menu[]> {
    const allMenus = await this.menuRepository.find({
      order: { sortOrder: 'ASC' },
    });

    const menuMap = new Map<string, Menu>();
    const roots: Menu[] = [];

    allMenus.forEach((menu) => {
      menuMap.set(menu.id, MenuMapper.toDomain(menu, []));
    });

    allMenus.forEach((menu) => {
      const domainMenu = menuMap.get(menu.id)!;
      if (menu.parentId && menuMap.has(menu.parentId)) {
        const parent = menuMap.get(menu.parentId)!;
        if (!parent.children) {
          parent.children = [];
        }
        parent.children.push(domainMenu);
      } else {
        roots.push(domainMenu);
      }
    });

    return roots;
  }

  async findTreeByRoleId(roleId: number): Promise<Menu[]> {
    const allMenus = await this.menuRepository.find({
      order: { sortOrder: 'ASC' },
    });

    const roleMenus = await this.roleMenuRepository.find({
      where: { roleId },
    });
    const assignedMenuIds = new Set(roleMenus.map((rm) => rm.menuId));

    const filteredMenus = allMenus.filter(
      (menu) => menu.status === 'active' && assignedMenuIds.has(menu.id),
    );

    const menuMap = new Map<string, Menu>();
    const roots: Menu[] = [];

    filteredMenus.forEach((menu) => {
      menuMap.set(menu.id, MenuMapper.toDomain(menu, []));
    });

    filteredMenus.forEach((menu) => {
      const domainMenu = menuMap.get(menu.id)!;
      if (menu.parentId && menuMap.has(menu.parentId)) {
        const parent = menuMap.get(menu.parentId)!;
        if (!parent.children) {
          parent.children = [];
        }
        parent.children.push(domainMenu);
      } else {
        roots.push(domainMenu);
      }
    });

    return roots;
  }

  async findById(id: Menu['id']): Promise<NullableType<Menu>> {
    const entity = await this.menuRepository.findOne({
      where: { id: id as string },
    });

    return entity ? MenuMapper.toDomain(entity) : null;
  }

  async findByCode(code: string): Promise<NullableType<Menu>> {
    const entity = await this.menuRepository.findOne({
      where: { code },
    });

    return entity ? MenuMapper.toDomain(entity) : null;
  }

  async update(id: Menu['id'], payload: Partial<Menu>): Promise<Menu | null> {
    const entity = await this.menuRepository.findOne({
      where: { id: id as string },
    });

    if (!entity) {
      return null;
    }

    if (payload.name !== undefined) entity.name = payload.name;
    if (payload.code !== undefined) entity.code = payload.code;
    if (payload.icon !== undefined) entity.icon = payload.icon;
    if (payload.path !== undefined) entity.path = payload.path;
    if (payload.parentId !== undefined) entity.parentId = payload.parentId;
    if (payload.sortOrder !== undefined) entity.sortOrder = payload.sortOrder;
    if (payload.status !== undefined) entity.status = payload.status;

    const updatedEntity = await this.menuRepository.save(entity);

    return MenuMapper.toDomain(updatedEntity);
  }

  async remove(id: Menu['id']): Promise<void> {
    await this.menuRepository.delete(id as string);
  }

  async assignMenusToRole(roleId: number, menuIds: string[]): Promise<void> {
    await this.roleMenuRepository.delete({ roleId });

    if (menuIds.length > 0) {
      const allMenuIds = await this.collectAncestorIds(menuIds);

      const roleMenus = allMenuIds.map((menuId) => {
        const roleMenu = new RoleMenuEntity();
        roleMenu.roleId = roleId;
        roleMenu.menuId = menuId;
        return roleMenu;
      });

      await this.roleMenuRepository.save(roleMenus);
    }
  }

  private async collectAncestorIds(menuIds: string[]): Promise<string[]> {
    const allMenus = await this.menuRepository.find();
    const menuMap = new Map<string, { id: string; parentId: string | null }>();

    allMenus.forEach((menu) => {
      menuMap.set(menu.id, { id: menu.id, parentId: menu.parentId });
    });

    const ancestorIds = new Set<string>();

    for (const menuId of menuIds) {
      ancestorIds.add(menuId);
      let current = menuMap.get(menuId);
      while (current && current.parentId) {
        ancestorIds.add(current.parentId);
        current = menuMap.get(current.parentId);
      }
    }

    return Array.from(ancestorIds);
  }

  async getMenusByRoleId(roleId: number): Promise<Menu[]> {
    const roleMenus = await this.roleMenuRepository.find({
      where: { roleId },
    });

    if (roleMenus.length === 0) {
      return [];
    }

    const menuIds = roleMenus.map((rm) => rm.menuId);
    const menus = await this.menuRepository.find({
      where: { id: In(menuIds) as any },
      order: { sortOrder: 'ASC' },
    });

    return menus.map((menu) => MenuMapper.toDomain(menu));
  }

  getMenusByPlanId(planId: string): { menuId: string }[] {
    // This method is no longer used here - use PlanMenuRepository directly

    void planId;
    return [];
  }

  getUserExtraMenus(userId: number): { menuId: string }[] {
    // This method is no longer used here - use UserMenuRepository directly

    void userId;
    return [];
  }

  async findByIds(ids: Menu['id'][]): Promise<Menu[]> {
    if (ids.length === 0) {
      return [];
    }
    const entities = await this.menuRepository.find({
      where: { id: In(ids as string[]) },
      order: { sortOrder: 'ASC' },
    });
    return entities.map((entity) => MenuMapper.toDomain(entity));
  }

  private get repository(): Repository<MenuEntity> {
    return this.menuRepository;
  }
}
