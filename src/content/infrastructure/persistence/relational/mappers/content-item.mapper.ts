import { ContentItem } from '../../../../domain/content-item';
import { ContentItemEntity } from '../entities/content-item.entity';

export class ContentItemMapper {
  static toDomain(raw: ContentItemEntity): ContentItem {
    const domainEntity = new ContentItem();
    domainEntity.id = raw.id;
    domainEntity.categoryId = raw.categoryId;
    domainEntity.title = raw.title;
    domainEntity.summary = raw.summary ?? null;
    domainEntity.originalContent = raw.originalContent ?? null;
    domainEntity.sourceFileUrl = raw.sourceFileUrl ?? null;
    domainEntity.jsonFileUrl = raw.jsonFileUrl ?? null;
    domainEntity.summaryFileUrl = raw.summaryFileUrl ?? null;
    domainEntity.images = raw.images ?? [];
    domainEntity.audioUrl = raw.audioUrl ?? null;
    domainEntity.transcript = raw.transcript ?? null;
    domainEntity.publishedAt = raw.publishedAt ?? null;
    domainEntity.collectedAt = raw.collectedAt;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;
    domainEntity.status = raw.status;
    domainEntity.metadata = raw.metadata ?? {};
    domainEntity.deletedAt = raw.deletedAt ?? null;
    return domainEntity;
  }

  static toPersistence(domainEntity: ContentItem): ContentItemEntity {
    const persistenceEntity = new ContentItemEntity();
    persistenceEntity.id = domainEntity.id;
    persistenceEntity.categoryId = domainEntity.categoryId;
    persistenceEntity.title = domainEntity.title;
    persistenceEntity.summary = domainEntity.summary ?? null;
    persistenceEntity.originalContent = domainEntity.originalContent ?? null;
    persistenceEntity.sourceFileUrl = domainEntity.sourceFileUrl ?? null;
    persistenceEntity.jsonFileUrl = domainEntity.jsonFileUrl ?? null;
    persistenceEntity.summaryFileUrl = domainEntity.summaryFileUrl ?? null;
    persistenceEntity.images = domainEntity.images ?? [];
    persistenceEntity.audioUrl = domainEntity.audioUrl ?? null;
    persistenceEntity.transcript = domainEntity.transcript ?? null;
    persistenceEntity.publishedAt = domainEntity.publishedAt ?? null;
    persistenceEntity.collectedAt = domainEntity.collectedAt;
    persistenceEntity.status = domainEntity.status;
    persistenceEntity.metadata = domainEntity.metadata ?? {};
    return persistenceEntity;
  }
}
