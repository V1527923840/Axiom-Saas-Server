import { Menu } from '../../../../domain/menu';
import { MenuEntity } from '../entities/menu.entity';

export class MenuMapper {
  static toDomain(entity: MenuEntity, children: Menu[] = []): Menu {
    return {
      id: entity.id,
      name: entity.name,
      code: entity.code,
      icon: entity.icon,
      path: entity.path,
      parentId: entity.parentId,
      sortOrder: entity.sortOrder,
      status: entity.status as Menu['status'],
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      children: children.length > 0 ? children : undefined,
    };
  }

  static toPersistence(
    domain: Omit<Menu, 'id' | 'createdAt' | 'updatedAt'>,
  ): Partial<MenuEntity> {
    return {
      name: domain.name,
      code: domain.code,
      icon: domain.icon,
      path: domain.path,
      parentId: domain.parentId,
      sortOrder: domain.sortOrder,
      status: domain.status,
    };
  }
}
