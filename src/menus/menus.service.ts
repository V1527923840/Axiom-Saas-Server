import { Injectable } from '@nestjs/common';
import { CreateMenuDto, UpdateMenuDto, AssignMenusDto } from './dto/menu.dto';
import { NullableType } from '../utils/types/nullable.type';
import { MenuRepository } from './infrastructure/persistence/menu.repository';
import { Menu } from './domain/menu';
import { IPaginationOptions } from '../utils/types/pagination-options';

@Injectable()
export class MenusService {
  constructor(private readonly menuRepository: MenuRepository) {}

  async create(createDto: CreateMenuDto): Promise<Menu> {
    return this.menuRepository.create({
      name: createDto.name,
      code: createDto.code,
      icon: createDto.icon ?? null,
      path: createDto.path,
      parentId: createDto.parentId ?? null,
      sortOrder: createDto.sortOrder ?? 0,
      status: createDto.status ?? 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Omit<Menu, 'id'>);
  }

  findAll(): Promise<Menu[]> {
    return this.menuRepository.findAll();
  }

  findTree(): Promise<Menu[]> {
    return this.menuRepository.findTree();
  }

  findTreeByRoleId(roleId: number): Promise<Menu[]> {
    return this.menuRepository.findTreeByRoleId(roleId);
  }

  findMenusWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }) {
    return this.menuRepository.findManyWithPagination({
      paginationOptions,
    });
  }

  findById(id: Menu['id']): Promise<NullableType<Menu>> {
    return this.menuRepository.findById(id);
  }

  async update(id: Menu['id'], updateDto: UpdateMenuDto): Promise<Menu | null> {
    return this.menuRepository.update(id, updateDto);
  }

  async remove(id: Menu['id']): Promise<void> {
    await this.menuRepository.remove(id);
  }

  async assignMenusToRole(
    roleId: number,
    assignDto: AssignMenusDto,
  ): Promise<void> {
    await this.menuRepository.assignMenusToRole(roleId, assignDto.menuIds);
  }

  async getMenusByRoleId(roleId: number): Promise<Menu[]> {
    return this.menuRepository.getMenusByRoleId(roleId);
  }

  async getUserMenuPaths(
    userId: number,
    roleIds: number[],
    currentPlanId?: string | null,
  ): Promise<string[]> {
    const allMenuIds = new Set<string>();

    // 1. Get menus from user's roles
    for (const roleId of roleIds) {
      const roleMenus = await this.menuRepository.getMenusByRoleId(roleId);
      roleMenus.forEach((m) => allMenuIds.add(m.id));
    }

    // 2. Get menus from plan
    if (currentPlanId) {
      const planMenus =
        await this.menuRepository.getMenusByPlanId(currentPlanId);
      planMenus.forEach((pm) => allMenuIds.add(pm.menuId));
    }

    // 3. Get user extra menus
    const userExtraMenus = await this.menuRepository.getUserExtraMenus(userId);
    userExtraMenus.forEach((um) => allMenuIds.add(um.menuId));

    if (allMenuIds.size === 0) {
      return [];
    }

    // Get all menus and extract paths
    const menus = await this.menuRepository.findByIds([...allMenuIds]);
    return menus.map((m) => m.path).filter((p) => p) as string[];
  }
}
