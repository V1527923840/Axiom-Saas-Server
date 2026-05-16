import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Allow } from 'class-validator';

export type ParseTaskStatus =
  | 'pending'
  | 'running'
  | 'success'
  | 'failed'
  | 'partial';

export class ParseTask {
  @Allow()
  @ApiProperty({ type: String })
  id: string;

  @Allow()
  @ApiProperty({ type: String })
  scrapeLogId: string;

  @Allow()
  @ApiProperty({ type: String })
  source: string;

  @Allow()
  @ApiProperty({ type: String })
  version: string;

  @Allow()
  @ApiProperty({ type: String })
  sourceFileKey: string;

  @Allow()
  @ApiPropertyOptional({ type: String, nullable: true })
  sourceFilename: string | null;

  @Allow()
  @ApiPropertyOptional({ type: String, nullable: true })
  outputJsonKey: string | null;

  @Allow()
  @ApiPropertyOptional({ type: String, nullable: true })
  outputMdKey: string | null;

  @Allow()
  @ApiProperty({ enum: ['pending', 'running', 'success', 'failed', 'partial'] })
  status: ParseTaskStatus;

  @Allow()
  @ApiPropertyOptional({ type: String, nullable: true })
  errorMessage: string | null;

  @Allow()
  @ApiProperty({ type: Number })
  retryCount: number;

  @Allow()
  @ApiPropertyOptional({ type: String, nullable: true })
  parser: string | null;

  @Allow()
  @ApiPropertyOptional({ type: Number, nullable: true })
  parseDurationMs: number | null;

  @Allow()
  @ApiPropertyOptional({ type: Date, nullable: true })
  startedAt: Date | null;

  @Allow()
  @ApiPropertyOptional({ type: Date, nullable: true })
  completedAt: Date | null;

  @Allow()
  @ApiProperty({ type: Date })
  createdAt: Date;

  @Allow()
  @ApiProperty({ type: Date })
  updatedAt: Date;

  @Allow()
  @ApiPropertyOptional({ type: Object, nullable: true })
  metadata: Record<string, any> | null;
}
