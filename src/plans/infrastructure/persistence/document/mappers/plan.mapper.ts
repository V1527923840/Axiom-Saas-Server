import { Plan } from '../../../../domain/plan';
import { PlanDocument } from '../entities/plan.schema';

export class PlanMapper {
  static toDomain(doc: PlanDocument): Plan {
    const domainEntity = new Plan();
    domainEntity.id = doc._id.toString();
    domainEntity.name = doc.name;
    domainEntity.tier = doc.tier;
    domainEntity.cycle = doc.cycle;
    domainEntity.pointsQuota = doc.pointsQuota;
    domainEntity.chatQuota = doc.chatQuota;
    domainEntity.price = doc.price;
    domainEntity.promotionalPrice = doc.promotionalPrice;
    domainEntity.description = doc.description;
    domainEntity.status = doc.status;
    domainEntity.createdAt = doc.createdAt;
    domainEntity.updatedAt = doc.updatedAt;
    domainEntity.deletedAt = doc.deletedAt ?? undefined;
    return domainEntity;
  }

  static toPersistence(domainEntity: Plan): Partial<PlanDocument> {
    return {
      name: domainEntity.name,
      tier: domainEntity.tier,
      cycle: domainEntity.cycle,
      pointsQuota: domainEntity.pointsQuota,
      chatQuota: domainEntity.chatQuota,
      price: domainEntity.price,
      promotionalPrice: domainEntity.promotionalPrice ?? null,
      description: domainEntity.description ?? null,
      status: domainEntity.status,
      createdAt: domainEntity.createdAt,
      updatedAt: domainEntity.updatedAt,
      deletedAt: domainEntity.deletedAt ?? null,
    };
  }
}
