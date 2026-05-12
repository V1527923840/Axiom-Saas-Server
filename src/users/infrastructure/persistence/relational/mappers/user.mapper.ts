import { FileEntity } from '../../../../../files/infrastructure/persistence/relational/entities/file.entity';
import { FileMapper } from '../../../../../files/infrastructure/persistence/relational/mappers/file.mapper';
import { RoleEntity } from '../../../../../roles/infrastructure/persistence/relational/entities/role.entity';
import { StatusEntity } from '../../../../../statuses/infrastructure/persistence/relational/entities/status.entity';
import { User } from '../../../../domain/user';
import { UserEntity } from '../entities/user.entity';

export class UserMapper {
  static toDomain(raw: UserEntity): User {
    const domainEntity = new User();
    domainEntity.id = raw.id;
    domainEntity.email = raw.email;
    domainEntity.password = raw.password;
    domainEntity.provider = raw.provider;
    domainEntity.socialId = raw.socialId;
    domainEntity.firstName = raw.firstName;
    domainEntity.lastName = raw.lastName;
    if (raw.photo) {
      domainEntity.photo = FileMapper.toDomain(raw.photo);
    }
    domainEntity.role = raw.role;
    domainEntity.status = raw.status;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;
    domainEntity.deletedAt = raw.deletedAt;
    domainEntity.tier = raw.tier;
    domainEntity.currentPlanId = raw.currentPlanId;
    domainEntity.pointsBalance = raw.pointsBalance;
    domainEntity.chatQuotaUsed = raw.chatQuotaUsed;
    domainEntity.chatQuotaTotal = raw.chatQuotaTotal;
    domainEntity.subscriptionExpiredAt =
      raw.subscriptionExpiredAt?.toISOString() ?? null;
    domainEntity.registeredAt = raw.registeredAt?.toISOString() ?? null;
    domainEntity.lastLoginAt = raw.lastLoginAt?.toISOString() ?? null;
    return domainEntity;
  }

  static toPersistence(domainEntity: User): UserEntity {
    let role: RoleEntity | undefined = undefined;

    if (domainEntity.role) {
      role = new RoleEntity();
      role.id = Number(domainEntity.role.id);
    }

    let photo: FileEntity | undefined | null = undefined;

    if (domainEntity.photo) {
      photo = new FileEntity();
      photo.id = domainEntity.photo.id;
      photo.path = domainEntity.photo.path;
    } else if (domainEntity.photo === null) {
      photo = null;
    }

    let status: StatusEntity | undefined = undefined;

    if (domainEntity.status) {
      status = new StatusEntity();
      status.id = Number(domainEntity.status.id);
    }

    const persistenceEntity = new UserEntity();
    if (domainEntity.id && typeof domainEntity.id === 'number') {
      persistenceEntity.id = domainEntity.id;
    }
    persistenceEntity.email = domainEntity.email;
    persistenceEntity.password = domainEntity.password;
    persistenceEntity.provider = domainEntity.provider;
    persistenceEntity.socialId = domainEntity.socialId;
    persistenceEntity.firstName = domainEntity.firstName;
    persistenceEntity.lastName = domainEntity.lastName;
    persistenceEntity.photo = photo;
    persistenceEntity.role = role;
    persistenceEntity.status = status;
    persistenceEntity.createdAt = domainEntity.createdAt;
    persistenceEntity.updatedAt = domainEntity.updatedAt;
    persistenceEntity.deletedAt = domainEntity.deletedAt;
    persistenceEntity.tier = domainEntity.tier;
    persistenceEntity.currentPlanId = domainEntity.currentPlanId ?? null;
    persistenceEntity.pointsBalance = domainEntity.pointsBalance ?? 0;
    persistenceEntity.chatQuotaUsed = domainEntity.chatQuotaUsed ?? 0;
    persistenceEntity.chatQuotaTotal = domainEntity.chatQuotaTotal ?? 0;
    persistenceEntity.subscriptionExpiredAt = domainEntity.subscriptionExpiredAt
      ? new Date(domainEntity.subscriptionExpiredAt)
      : null;
    persistenceEntity.registeredAt = domainEntity.registeredAt
      ? new Date(domainEntity.registeredAt)
      : null;
    persistenceEntity.lastLoginAt = domainEntity.lastLoginAt
      ? new Date(domainEntity.lastLoginAt)
      : null;
    return persistenceEntity;
  }
}
