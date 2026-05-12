import { PaymentFlow } from '../../../../domain/payment-flow';
import { PaymentFlowEntity } from '../entities/payment-flow.entity';

export class PaymentFlowMapper {
  static toDomain(entity: PaymentFlowEntity): PaymentFlow {
    return {
      id: entity.id,
      userId: entity.userId,
      userName: entity.userName,
      userEmail: entity.userEmail,
      orderNo: entity.orderNo,
      type: entity.type as PaymentFlow['type'],
      paymentMethod: entity.paymentMethod as PaymentFlow['paymentMethod'],
      amount: Number(entity.amount),
      points: entity.points,
      status: entity.status as PaymentFlow['status'],
      metadata: entity.metadata || {},
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      completedAt: entity.completedAt,
    };
  }

  static toPersistence(
    domain: Omit<PaymentFlow, 'id' | 'createdAt' | 'updatedAt'>,
  ): Partial<PaymentFlowEntity> {
    return {
      userId: domain.userId,
      userName: domain.userName,
      userEmail: domain.userEmail,
      orderNo: domain.orderNo,
      type: domain.type,
      paymentMethod: domain.paymentMethod,
      amount: domain.amount,
      points: domain.points,
      status: domain.status,
      metadata: domain.metadata,
      completedAt: domain.completedAt,
    };
  }
}
