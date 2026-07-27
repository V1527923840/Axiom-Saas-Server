import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentFlow } from '../domain/payment-flow';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class FilterPaymentFlowDto {
  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @IsNumber()
  userId?: number;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  userName?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  userEmail?: string;

  @ApiPropertyOptional({ enum: ['recharge', 'refund'] })
  @IsOptional()
  @IsIn(['recharge', 'refund'])
  type?: 'recharge' | 'refund';

  @ApiPropertyOptional({ enum: ['wechat', 'alipay', 'bankcard', 'other'] })
  @IsOptional()
  @IsIn(['wechat', 'alipay', 'bankcard', 'other'])
  paymentMethod?: 'wechat' | 'alipay' | 'bankcard' | 'other';

  @ApiPropertyOptional({ enum: ['pending', 'completed', 'failed', 'refunded'] })
  @IsOptional()
  @IsIn(['pending', 'completed', 'failed', 'refunded'])
  status?: 'pending' | 'completed' | 'failed' | 'refunded';

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  dateTo?: string;
}

export class SortPaymentFlowDto {
  @ApiProperty()
  @Type(() => String)
  @IsString()
  orderBy: keyof PaymentFlow;

  @ApiProperty()
  @IsString()
  order: 'ASC' | 'DESC';
}

export class QueryPaymentFlowDto extends PaginationQueryDto {
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  userName?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  userEmail?: string;

  @ApiPropertyOptional({ enum: ['recharge', 'refund'] })
  @IsOptional()
  @IsIn(['recharge', 'refund'])
  type?: 'recharge' | 'refund';

  @ApiPropertyOptional({ enum: ['wechat', 'alipay', 'bankcard', 'other'] })
  @IsOptional()
  @IsIn(['wechat', 'alipay', 'bankcard', 'other'])
  paymentMethod?: 'wechat' | 'alipay' | 'bankcard' | 'other';

  @ApiPropertyOptional({ enum: ['pending', 'completed', 'failed', 'refunded'] })
  @IsOptional()
  @IsIn(['pending', 'completed', 'failed', 'refunded'])
  status?: 'pending' | 'completed' | 'failed' | 'refunded';

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  dateTo?: string;
}
