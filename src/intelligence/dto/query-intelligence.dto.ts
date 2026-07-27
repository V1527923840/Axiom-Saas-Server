import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class QueryIntelligenceDto extends PaginationQueryDto {
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
}
