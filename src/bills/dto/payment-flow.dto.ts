import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsIn,
} from 'class-validator';

export class CreatePaymentFlowDto {
  @ApiProperty({ type: Number })
  @IsNotEmpty()
  @IsNumber()
  userId: number;

  @ApiProperty({ type: String })
  @IsNotEmpty()
  @IsString()
  userName: string;

  @ApiProperty({ type: String })
  @IsNotEmpty()
  @IsString()
  userEmail: string;

  @ApiProperty({ type: String })
  @IsNotEmpty()
  @IsString()
  orderNo: string;

  @ApiProperty({ enum: ['recharge', 'refund'] })
  @IsNotEmpty()
  @IsIn(['recharge', 'refund'])
  type: 'recharge' | 'refund';

  @ApiProperty({ enum: ['wechat', 'alipay', 'bankcard', 'other'] })
  @IsNotEmpty()
  @IsIn(['wechat', 'alipay', 'bankcard', 'other'])
  paymentMethod: 'wechat' | 'alipay' | 'bankcard' | 'other';

  @ApiProperty({ type: Number })
  @IsNotEmpty()
  @IsNumber()
  amount: number;

  @ApiProperty({ type: Number })
  @IsNotEmpty()
  @IsNumber()
  points: number;

  @ApiPropertyOptional({ enum: ['pending', 'completed', 'failed', 'refunded'] })
  @IsOptional()
  @IsIn(['pending', 'completed', 'failed', 'refunded'])
  status?: 'pending' | 'completed' | 'failed' | 'refunded';

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdatePaymentFlowDto {
  @ApiPropertyOptional({ enum: ['pending', 'completed', 'failed', 'refunded'] })
  @IsOptional()
  @IsIn(['pending', 'completed', 'failed', 'refunded'])
  status?: 'pending' | 'completed' | 'failed' | 'refunded';

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  metadata?: Record<string, any>;
}
