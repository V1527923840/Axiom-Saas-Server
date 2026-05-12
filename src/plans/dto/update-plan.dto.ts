import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { CreatePlanDto } from './create-plan.dto';

import { IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdatePlanDto extends PartialType(CreatePlanDto) {
  @ApiPropertyOptional({ example: '基础套餐/月', type: String })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Lv1', type: String })
  @IsOptional()
  @IsString()
  tier?: string;

  @ApiPropertyOptional({ example: 'monthly', type: String })
  @IsOptional()
  @IsString()
  cycle?: string;

  @ApiPropertyOptional({ example: 100, type: Number })
  @IsOptional()
  @IsNumber()
  pointsQuota?: number;

  @ApiPropertyOptional({ example: 50, type: Number })
  @IsOptional()
  @IsNumber()
  chatQuota?: number;

  @ApiPropertyOptional({ example: 29, type: Number })
  @IsOptional()
  @IsNumber()
  price?: number;

  @ApiPropertyOptional({ example: 19, type: Number })
  @IsOptional()
  @IsNumber()
  promotionalPrice?: number;

  @ApiPropertyOptional({ example: '基础订阅套餐，适合日常使用', type: String })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'active', type: String })
  @IsOptional()
  @IsString()
  status?: string;
}
