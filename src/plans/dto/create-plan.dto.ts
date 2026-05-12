import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsIn,
} from 'class-validator';

export class CreatePlanDto {
  @ApiProperty({ example: '基础套餐/月', type: String })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: 'Lv1', type: String })
  @IsNotEmpty()
  @IsIn(['Lv0', 'Lv1', 'Lv2', 'Lv3'])
  tier: string;

  @ApiProperty({ example: 'monthly', type: String })
  @IsNotEmpty()
  @IsIn(['monthly', 'yearly'])
  cycle: string;

  @ApiProperty({ example: 100, type: Number })
  @IsNotEmpty()
  @IsNumber()
  pointsQuota: number;

  @ApiProperty({ example: 50, type: Number })
  @IsNotEmpty()
  @IsNumber()
  chatQuota: number;

  @ApiProperty({ example: 29, type: Number })
  @IsNotEmpty()
  @IsNumber()
  price: number;

  @ApiPropertyOptional({ example: 19, type: Number })
  @IsOptional()
  @IsNumber()
  promotionalPrice?: number;

  @ApiPropertyOptional({ example: '基础订阅套餐，适合日常使用', type: String })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'active', type: String })
  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: string;
}
