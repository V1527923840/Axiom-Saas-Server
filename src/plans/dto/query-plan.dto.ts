import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { Plan } from '../domain/plan';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class FilterPlanDto {
  @ApiPropertyOptional({ example: 'monthly', type: String })
  @IsOptional()
  @IsIn(['monthly', 'yearly'])
  cycle?: string;

  @ApiPropertyOptional({ example: 'Lv1', type: String })
  @IsOptional()
  @IsIn(['Lv0', 'Lv1', 'Lv2', 'Lv3'])
  tier?: string;

  @ApiPropertyOptional({ example: 'active', type: String })
  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: string;
}

export class SortPlanDto {
  @ApiProperty()
  @Type(() => String)
  @IsString()
  orderBy: keyof Plan;

  @ApiProperty()
  @IsString()
  order: string;
}

export class QueryPlanDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 'monthly', type: String })
  @IsOptional()
  @IsIn(['monthly', 'yearly'])
  cycle?: string;

  @ApiPropertyOptional({ example: 'Lv1', type: String })
  @IsOptional()
  @IsIn(['Lv0', 'Lv1', 'Lv2', 'Lv3'])
  tier?: string;

  @ApiPropertyOptional({ example: 'active', type: String })
  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: string;
}
