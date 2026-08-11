import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  Matches,
  Max,
  Min,
  Validate,
} from 'class-validator';
import { IsDateRangeOrderedConstraint } from '../../utils/validators/is-date-range-ordered.validator';

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
    example: '2026-08-01',
    description:
      'Inclusive lower bound for report_date (YYYY-MM-DD). Used with dateTo to define a date range.',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'dateFrom must be a YYYY-MM-DD string',
  })
  @IsDateString(
    {},
    { message: 'dateFrom must be a real calendar date (YYYY-MM-DD)' },
  )
  dateFrom?: string;

  @ApiPropertyOptional({
    type: String,
    example: '2026-08-11',
    description:
      'Inclusive upper bound for report_date (YYYY-MM-DD). Used with dateFrom to define a date range.',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'dateTo must be a YYYY-MM-DD string',
  })
  @IsDateString(
    {},
    { message: 'dateTo must be a real calendar date (YYYY-MM-DD)' },
  )
  @Validate(IsDateRangeOrderedConstraint)
  dateTo?: string;

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
