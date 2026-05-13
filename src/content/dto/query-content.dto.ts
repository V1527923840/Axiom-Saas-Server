import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
  IsDateString,
} from 'class-validator';
import { Transform, Type, plainToInstance } from 'class-transformer';
import { ContentItem } from '../domain/content-item';

export class SortContentDto {
  @ApiPropertyOptional()
  @Type(() => String)
  @IsString()
  orderBy?: keyof ContentItem;

  @ApiPropertyOptional()
  @IsString()
  order?: string;
}

export class FilterContentDto {
  @ApiPropertyOptional({
    type: String,
    example: 'active',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    type: String,
    example: 'negative',
    description: 'Sentiment filter: positive, negative, neutral',
  })
  @IsOptional()
  @IsString()
  sentiment?: string;

  @ApiPropertyOptional({
    type: String,
    example: '康方生物',
    description: 'Company name search',
  })
  @IsOptional()
  @IsString()
  company?: string;

  @ApiPropertyOptional({
    type: String,
    example: '2026-05-01',
    description: 'Start date filter (ISO string)',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    type: String,
    example: '2026-05-13',
    description: 'End date filter (ISO string)',
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({
    type: String,
    example: 'UNSTRUCTURED_TEXT',
    description: 'Category code filter',
  })
  @IsOptional()
  @IsString()
  categoryCode?: string;

  @ApiPropertyOptional({
    type: String,
    example: 'carrier',
    description: 'Layer filter: carrier, info_type, financial',
  })
  @IsOptional()
  @IsString()
  layer?: string;

  @ApiPropertyOptional({
    type: String,
    example: 'zsxq_parser',
    description: 'Parser type filter',
  })
  @IsOptional()
  @IsString()
  parser?: string;
}

export class QueryContentDto {
  @ApiPropertyOptional()
  @Transform(({ value }) => (value ? Number(value) : 1))
  @IsNumber()
  @IsOptional()
  page?: number;

  @ApiPropertyOptional()
  @Transform(({ value }) => (value ? Number(value) : 10))
  @IsNumber()
  @IsOptional()
  pageSize?: number;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @Transform((value: unknown) => {
    if (typeof value === 'string') {
      return plainToInstance(FilterContentDto, JSON.parse(value));
    }
    return undefined;
  })
  @ValidateNested()
  @Type(() => FilterContentDto)
  filters?: FilterContentDto | null;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @Transform((value: unknown) => {
    if (typeof value === 'string') {
      return plainToInstance(SortContentDto, JSON.parse(value));
    }
    return undefined;
  })
  @ValidateNested({ each: true })
  @Type(() => SortContentDto)
  sort?: SortContentDto[] | null;
}
