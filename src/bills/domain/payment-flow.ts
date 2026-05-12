import { ApiProperty } from '@nestjs/swagger';
import { Allow } from 'class-validator';

export type PaymentFlowType = 'recharge' | 'refund';
export type PaymentMethod = 'wechat' | 'alipay' | 'bankcard' | 'other';
export type PaymentFlowStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export class PaymentFlow {
  @Allow()
  @ApiProperty({ type: String })
  id: string;

  @Allow()
  @ApiProperty({ type: Number })
  userId: number;

  @Allow()
  @ApiProperty({ type: String })
  userName: string;

  @Allow()
  @ApiProperty({ type: String })
  userEmail: string;

  @Allow()
  @ApiProperty({ type: String })
  orderNo: string;

  @Allow()
  @ApiProperty({ enum: ['recharge', 'refund'] })
  type: PaymentFlowType;

  @Allow()
  @ApiProperty({ enum: ['wechat', 'alipay', 'bankcard', 'other'] })
  paymentMethod: PaymentMethod;

  @Allow()
  @ApiProperty({ type: Number })
  amount: number;

  @Allow()
  @ApiProperty({ type: Number })
  points: number;

  @Allow()
  @ApiProperty({ enum: ['pending', 'completed', 'failed', 'refunded'] })
  status: PaymentFlowStatus;

  @Allow()
  @ApiProperty({ type: Object })
  metadata: Record<string, any>;

  @Allow()
  @ApiProperty()
  createdAt: Date;

  @Allow()
  @ApiProperty()
  updatedAt: Date;

  @Allow()
  @ApiProperty({ type: Date, nullable: true })
  completedAt: Date | null;
}
