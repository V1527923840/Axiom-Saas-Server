import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsIn, IsNumber } from 'class-validator';
import { Type, plainToInstance, Transform } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { PaymentFlow } from '../domain/payment-flow';

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

export class QueryPaymentFlowDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @Transform(({ value }) =>
    value
      ? plainToInstance(FilterPaymentFlowDto, JSON.parse(value))
      : undefined,
  )
  @ValidateNested()
  @Type(() => FilterPaymentFlowDto)
  filters?: FilterPaymentFlowDto | null;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @Transform(({ value }) => {
    return value
      ? plainToInstance(SortPaymentFlowDto, JSON.parse(value))
      : undefined;
  })
  @ValidateNested({ each: true })
  @Type(() => SortPaymentFlowDto)
  sort?: SortPaymentFlowDto[] | null;
}
