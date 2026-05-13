import { NullableType } from '../../../utils/types/nullable.type';
import { Menu } from '../../domain/menu';
import { IPaginationOptions } from '../../../utils/types/pagination-options';

export abstract class MenuRepository {
  abstract create(
    data: Omit<Menu, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Menu>;

  abstract findManyWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<{ data: Menu[]; total: number }>;

  abstract findAll(): Promise<Menu[]>;

  abstract findTree(): Promise<Menu[]>;

  abstract findTreeByRoleId(roleId: number): Promise<Menu[]>;

  abstract findById(id: Menu['id']): Promise<NullableType<Menu>>;

  abstract findByCode(code: string): Promise<NullableType<Menu>>;

  abstract update(id: Menu['id'], payload: Partial<Menu>): Promise<Menu | null>;

  abstract remove(id: Menu['id']): Promise<void>;

  abstract assignMenusToRole(roleId: number, menuIds: string[]): Promise<void>;

  abstract getMenusByRoleId(roleId: number): Promise<Menu[]>;

  abstract findByIds(ids: Menu['id'][]): Promise<Menu[]>;
}
