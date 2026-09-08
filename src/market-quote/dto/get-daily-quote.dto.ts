import { ApiProperty } from '@nestjs/swagger';
import { IsIn, Matches } from 'class-validator';

const RANGES = ['1d', '1w', '3m', '6m', '1y', 'all'] as const;
export type DailyQuoteRange = (typeof RANGES)[number];

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
    description: 'Time range for the K-line data',
    enum: RANGES,
    example: '1d',
    default: '1d',
  })
  @IsIn(RANGES, { message: `range must be one of: ${RANGES.join(', ')}` })
  range: DailyQuoteRange = '1d';
}