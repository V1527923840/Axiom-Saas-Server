import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  IsIn,
  ValidateNested,
} from 'class-validator';
import { Transform, Type, plainToInstance } from 'class-transformer';
import { Plan } from '../domain/plan';

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

export class QueryPlanDto {
  @ApiPropertyOptional()
  @Transform(({ value }) => (value ? Number(value) : 1))
  @IsNumber()
  @IsOptional()
  page?: number;

  @ApiPropertyOptional()
  @Transform(({ value }) => (value ? Number(value) : 10))
  @IsNumber()
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @Transform(({ value }) =>
    value ? plainToInstance(FilterPlanDto, JSON.parse(value)) : undefined,
  )
  @ValidateNested()
  @Type(() => FilterPlanDto)
  filters?: FilterPlanDto | null;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @Transform(({ value }) => {
    return value ? plainToInstance(SortPlanDto, JSON.parse(value)) : undefined;
  })
  @ValidateNested({ each: true })
  @Type(() => SortPlanDto)
  sort?: SortPlanDto[] | null;
}
