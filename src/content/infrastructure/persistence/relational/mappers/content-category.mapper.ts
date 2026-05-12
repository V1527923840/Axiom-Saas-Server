import { ContentCategory } from '../../../../domain/content-category';
import { ContentCategoryEntity } from '../entities/content-category.entity';

export class ContentCategoryMapper {
  static toDomain(raw: ContentCategoryEntity): ContentCategory {
    const domainEntity = new ContentCategory();
    domainEntity.id = raw.id;
    domainEntity.name = raw.name;
    domainEntity.code = raw.code;
    domainEntity.description = raw.description ?? null;
    domainEntity.sortOrder = raw.sortOrder;
    domainEntity.isActive = raw.isActive;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;
    return domainEntity;
  }

  static toPersistence(domainEntity: ContentCategory): ContentCategoryEntity {
    const persistenceEntity = new ContentCategoryEntity();
    persistenceEntity.id = domainEntity.id;
    persistenceEntity.name = domainEntity.name;
    persistenceEntity.code = domainEntity.code;
    persistenceEntity.description = domainEntity.description ?? null;
    persistenceEntity.sortOrder = domainEntity.sortOrder;
    persistenceEntity.isActive = domainEntity.isActive;
    return persistenceEntity;
  }
}
