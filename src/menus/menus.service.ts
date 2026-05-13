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
}
