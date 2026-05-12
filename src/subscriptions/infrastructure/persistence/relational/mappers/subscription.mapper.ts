import { Subscription } from '../../../../domain/subscription';
import { SubscriptionEntity } from '../entities/subscription.entity';

export class SubscriptionMapper {
  static toDomain(raw: SubscriptionEntity): Subscription {
    const domainEntity = new Subscription();
    domainEntity.id = raw.id;
    domainEntity.userId = raw.userId;
    domainEntity.planId = raw.planId;
    domainEntity.planName = raw.planName;
    domainEntity.cycle = raw.cycle;
    domainEntity.price = Number(raw.price);
    domainEntity.subscribedAt = raw.subscribedAt;
    domainEntity.expiredAt = raw.expiredAt;
    domainEntity.status = raw.status;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;
    domainEntity.deletedAt = raw.deletedAt;
    return domainEntity;
  }

  static toPersistence(domainEntity: Subscription): SubscriptionEntity {
    const persistenceEntity = new SubscriptionEntity();
    if (domainEntity.id) {
      persistenceEntity.id = domainEntity.id as string;
    }
    persistenceEntity.userId = domainEntity.userId;
    persistenceEntity.planId = domainEntity.planId;
    persistenceEntity.planName = domainEntity.planName;
    persistenceEntity.cycle = domainEntity.cycle;
    persistenceEntity.price = domainEntity.price;
    persistenceEntity.subscribedAt = domainEntity.subscribedAt;
    persistenceEntity.expiredAt = domainEntity.expiredAt;
    persistenceEntity.status = domainEntity.status;
    persistenceEntity.createdAt = domainEntity.createdAt;
    persistenceEntity.updatedAt = domainEntity.updatedAt;
    persistenceEntity.deletedAt = domainEntity.deletedAt as Date;
    return persistenceEntity;
  }
}
