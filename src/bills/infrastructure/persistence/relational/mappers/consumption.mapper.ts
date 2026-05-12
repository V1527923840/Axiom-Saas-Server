import { Consumption } from '../../../../domain/consumption';
import { ConsumptionEntity } from '../entities/consumption.entity';

export class ConsumptionMapper {
  static toDomain(entity: ConsumptionEntity): Consumption {
    return {
      id: entity.id,
      userId: entity.userId,
      userName: entity.userName,
      userEmail: entity.userEmail,
      consumeType: entity.consumeType as Consumption['consumeType'],
      points: entity.points,
      balance: entity.balance,
      businessId: entity.businessId,
      businessType: entity.businessType,
      description: entity.description,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  static toPersistence(
    domain: Omit<Consumption, 'id' | 'createdAt' | 'updatedAt'>,
  ): Partial<ConsumptionEntity> {
    return {
      userId: domain.userId,
      userName: domain.userName,
      userEmail: domain.userEmail,
      consumeType: domain.consumeType,
      points: domain.points,
      balance: domain.balance,
      businessId: domain.businessId,
      businessType: domain.businessType,
      description: domain.description,
    };
  }
}
