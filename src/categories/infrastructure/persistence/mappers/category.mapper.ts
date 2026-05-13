import { Category } from 'src/categories/domain/category';
import { ContentCategoryEntity } from 'src/content/infrastructure/persistence/relational/entities/content-category.entity';

export class CategoryMapper {
  static toDomain(raw: ContentCategoryEntity): Category {
    const domainEntity = new Category();
    domainEntity.id = raw.id;
    domainEntity.name = raw.name;
    domainEntity.code = raw.code;
    domainEntity.layer = raw.layer ?? 'carrier';
    domainEntity.parentCode = raw.parentCode ?? null;
    domainEntity.description = raw.description ?? null;
    domainEntity.sortOrder = raw.sortOrder;
    domainEntity.isActive = raw.isActive;
    domainEntity.metadata = raw.metadata ?? {};
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;
    return domainEntity;
  }

  static toPersistence(domainEntity: Category): ContentCategoryEntity {
    const persistenceEntity = new ContentCategoryEntity();
    persistenceEntity.id = domainEntity.id;
    persistenceEntity.name = domainEntity.name;
    persistenceEntity.code = domainEntity.code;
    persistenceEntity.layer = domainEntity.layer;
    persistenceEntity.parentCode = domainEntity.parentCode ?? null;
    persistenceEntity.description = domainEntity.description ?? null;
    persistenceEntity.sortOrder = domainEntity.sortOrder;
    persistenceEntity.isActive = domainEntity.isActive;
    persistenceEntity.metadata = domainEntity.metadata ?? {};
    return persistenceEntity;
  }
}
