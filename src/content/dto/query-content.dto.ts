import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type, Transform, plainToInstance } from 'class-transformer';
import { ContentItem } from '../domain/content-item';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

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

export class QueryContentDto extends PaginationQueryDto {
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @Transform((value: unknown) => {
    const v = (value as { value?: unknown })?.value ?? value;
    if (typeof v === 'string') {
      return plainToInstance(FilterContentDto, JSON.parse(v));
    }
    return undefined;
  })
  @ValidateNested()
  @Type(() => FilterContentDto)
  filters?: FilterContentDto | null;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @Transform((value: unknown) => {
    const v = (value as { value?: unknown })?.value ?? value;
    if (typeof v === 'string') {
      return plainToInstance(SortContentDto, JSON.parse(v));
    }
    return undefined;
  })
  @ValidateNested({ each: true })
  @Type(() => SortContentDto)
  sort?: SortContentDto[] | null;
}
