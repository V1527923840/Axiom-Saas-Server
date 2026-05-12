import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateSubscriptionDto {
  @ApiProperty({ example: 'plan-uuid', type: String })
  @IsNotEmpty()
  @IsUUID()
  planId: string;

  @ApiPropertyOptional({ example: 'user-uuid', type: String })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ example: '基础套餐/年', type: String })
  @IsOptional()
  @IsString()
  planName?: string;

  @ApiPropertyOptional({ example: 299, type: Number })
  @IsOptional()
  price?: number;

  @ApiPropertyOptional({ example: 'yearly', type: String })
  @IsOptional()
  @IsString()
  cycle?: string;
}
