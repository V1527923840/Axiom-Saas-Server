import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, Matches } from 'class-validator';

const RANGES = ['1d', '1w', '3m', '6m', '1y', 'all'] as const;
export type DailyQuoteRange = (typeof RANGES)[number];

// YYYY-MM-DD 校验
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export class GetDailyQuoteDto {
  @ApiProperty({
    description: 'A-share ts_code, e.g. 600519.SH',
    example: '600519.SH',
    pattern: '^\\d{6}\\.(SH|SZ|BJ)$',
  })
  @Matches(/^\d{6}\.(SH|SZ|BJ)$/, {
    message: 'ts_code must match A-share format: 6 digits + .SH|SZ|BJ',
  })
  ts_code!: string;

  @ApiProperty({
    description:
      'Time range for the K-line data. Ignored when start_date/end_date are provided.',
    enum: RANGES,
    example: '1d',
    default: '1d',
    required: false,
  })
  @IsOptional()
  @IsIn(RANGES, { message: `range must be one of: ${RANGES.join(', ')}` })
  range?: DailyQuoteRange = '1d';

  @ApiProperty({
    description:
      'Custom start date (YYYY-MM-DD). When provided, overrides range.',
    example: '2026-01-01',
    required: false,
  })
  @IsOptional()
  @Matches(DATE_RE, {
    message: 'start_date must match YYYY-MM-DD format',
  })
  start_date?: string;

  @ApiProperty({
    description:
      'Custom end date (YYYY-MM-DD). When provided, overrides range.',
    example: '2026-09-09',
    required: false,
  })
  @IsOptional()
  @Matches(DATE_RE, {
    message: 'end_date must match YYYY-MM-DD format',
  })
  end_date?: string;
}
