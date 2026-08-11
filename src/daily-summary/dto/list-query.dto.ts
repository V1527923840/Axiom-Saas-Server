import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Matches, Max, Min } from 'class-validator';

export class ListQueryDto {
  @ApiPropertyOptional({
    enum: ['daily', 'weekly'],
    example: 'daily',
    description: 'Filter by summary frequency bucket.',
  })
  @IsOptional()
  @IsIn(['daily', 'weekly'])
  frequency?: 'daily' | 'weekly';

  @ApiPropertyOptional({
    type: String,
    example: '2026-08-07',
    description: 'Exact-match filter against report_date (YYYY-MM-DD).',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'reportDate must be a YYYY-MM-DD string',
  })
  reportDate?: string;

  @ApiPropertyOptional({
    type: Number,
    minimum: 0,
    default: 0,
    example: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  page?: number = 0;

  @ApiPropertyOptional({
    type: Number,
    minimum: 1,
    maximum: 100,
    default: 20,
    example: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}
