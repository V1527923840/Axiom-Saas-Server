import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
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
