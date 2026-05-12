import { Subscription } from '../../../../domain/subscription';
import { SubscriptionDocument } from '../entities/subscription.schema';

export class SubscriptionMapper {
  static toDomain(doc: SubscriptionDocument): Subscription {
    const domainEntity = new Subscription();
    domainEntity.id = doc._id.toString();
    domainEntity.userId = Number(doc.userId);
    domainEntity.planId = doc.planId;
    domainEntity.planName = doc.planName;
    domainEntity.cycle = doc.cycle;
    domainEntity.price = doc.price;
    domainEntity.subscribedAt = doc.subscribedAt;
    domainEntity.expiredAt = doc.expiredAt;
    domainEntity.status = doc.status;
    domainEntity.createdAt = doc.createdAt;
    domainEntity.updatedAt = doc.updatedAt;
    domainEntity.deletedAt = doc.deletedAt ?? undefined;
    return domainEntity;
  }

  static toPersistence(
    domainEntity: Subscription,
  ): Partial<SubscriptionDocument> {
    return {
      userId: String(domainEntity.userId),
      planId: domainEntity.planId,
      planName: domainEntity.planName,
      cycle: domainEntity.cycle,
      price: domainEntity.price,
      subscribedAt: domainEntity.subscribedAt,
      expiredAt: domainEntity.expiredAt,
      status: domainEntity.status,
      createdAt: domainEntity.createdAt,
      updatedAt: domainEntity.updatedAt,
      deletedAt: domainEntity.deletedAt ?? null,
    };
  }
}
