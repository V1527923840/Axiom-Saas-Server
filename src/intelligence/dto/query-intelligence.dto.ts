import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';

export class QueryIntelligenceDto {
  @ApiPropertyOptional({ description: 'Page number (default: 1)' })
  @Transform(({ value }) => (value ? Number(value) : 1))
  @IsNumber()
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: 'Page size (default: 10)' })
  @Transform(({ value }) => (value ? Number(value) : 10))
  @IsNumber()
  @IsOptional()
  pageSize?: number;

  @ApiPropertyOptional({
    type: String,
    description: 'Level 1 category filter',
    example: 'INDUSTRY',
  })
  @IsOptional()
  @IsString()
  categoryL1?: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Level 2 category filter',
    example: 'INDUSTRY_NEWS',
  })
  @IsOptional()
  @IsString()
  categoryL2?: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Value rating filter',
    example: '高',
  })
  @IsOptional()
  @IsString()
  valueRating?: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Company name search',
    example: '海光信息',
  })
  @IsOptional()
  @IsString()
  company?: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Keyword search',
    example: 'AI',
  })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Start date filter (YYYY-MM-DD)',
    example: '2026-05-01',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    type: String,
    description: 'End date filter (YYYY-MM-DD)',
    example: '2026-05-31',
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Sort field',
    example: 'postDate',
  })
  @IsOptional()
  @IsString()
  sortBy?: 'postDate' | 'createdAt' | 'totalScore';

  @ApiPropertyOptional({
    type: String,
    description: 'Sort order',
    example: 'desc',
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}
