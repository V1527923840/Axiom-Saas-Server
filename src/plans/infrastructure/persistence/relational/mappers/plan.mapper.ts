import { Plan } from '../../../../domain/plan';
import { PlanEntity } from '../entities/plan.entity';

export class PlanMapper {
  static toDomain(raw: PlanEntity): Plan {
    const domainEntity = new Plan();
    domainEntity.id = raw.id;
    domainEntity.name = raw.name;
    domainEntity.tier = raw.tier;
    domainEntity.cycle = raw.cycle;
    domainEntity.pointsQuota = raw.pointsQuota;
    domainEntity.chatQuota = raw.chatQuota;
    domainEntity.price = Number(raw.price);
    domainEntity.promotionalPrice = raw.promotionalPrice
      ? Number(raw.promotionalPrice)
      : null;
    domainEntity.description = raw.description;
    domainEntity.status = raw.status;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;
    domainEntity.deletedAt = raw.deletedAt;
    return domainEntity;
  }

  static toPersistence(domainEntity: Plan): PlanEntity {
    const persistenceEntity = new PlanEntity();
    if (domainEntity.id) {
      persistenceEntity.id = domainEntity.id as string;
    }
    persistenceEntity.name = domainEntity.name;
    persistenceEntity.tier = domainEntity.tier;
    persistenceEntity.cycle = domainEntity.cycle;
    persistenceEntity.pointsQuota = domainEntity.pointsQuota;
    persistenceEntity.chatQuota = domainEntity.chatQuota;
    persistenceEntity.price = domainEntity.price;
    persistenceEntity.promotionalPrice = domainEntity.promotionalPrice ?? null;
    persistenceEntity.description = domainEntity.description ?? null;
    persistenceEntity.status = domainEntity.status;
    persistenceEntity.createdAt = domainEntity.createdAt;
    persistenceEntity.updatedAt = domainEntity.updatedAt;
    persistenceEntity.deletedAt = domainEntity.deletedAt as Date;
    return persistenceEntity;
  }
}
