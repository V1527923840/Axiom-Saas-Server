import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class ScanFileDto {
  @ApiProperty({
    type: String,
    example: 'zsxq_all_20260504093821_extracted.json',
  })
  @IsString()
  filename: string;

  @ApiProperty({
    type: String,
    example: 'zsxq_parser',
  })
  @IsString()
  parser: string;

  @ApiProperty({
    type: Number,
    example: 182,
  })
  @IsNumber()
  entryCount: number;

  @ApiProperty({
    type: Number,
    example: 1048576,
  })
  @IsNumber()
  size: number;

  @ApiProperty({
    type: Date,
    example: '2026-05-04T09:38:21Z',
  })
  @IsString()
  modifiedAt: string;
}

export class ScanFilesResponseDto {
  @ApiProperty({ type: [ScanFileDto] })
  data: ScanFileDto[];

  @ApiProperty({ type: Number, example: 15 })
  total: number;
}

export class ImportOptionsDto {
  @ApiPropertyOptional({
    type: Boolean,
    example: false,
    description: 'Preview mode without actual import',
  })
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;

  @ApiPropertyOptional({
    type: Number,
    example: 100,
    description: 'Batch size for import',
  })
  @IsOptional()
  @IsNumber()
  batchSize?: number;
}

export class ImportRequestDto {
  @ApiProperty({
    type: [String],
    example: ['zsxq_all_20260504093821_extracted.json'],
  })
  @IsArray()
  @IsString({ each: true })
  files: string[];

  @ApiPropertyOptional({ type: ImportOptionsDto })
  @IsOptional()
  options?: ImportOptionsDto;
}

export class ImportResponseDto {
  @ApiProperty({
    type: String,
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  jobId: string;

  @ApiProperty({
    type: String,
    example: 'processing',
  })
  status: string;

  @ApiProperty({
    type: Number,
    example: 182,
  })
  estimatedItems: number;

  @ApiProperty({
    type: Date,
    example: '2026-05-13T10:00:00Z',
  })
  startedAt: string;
}

export class JobStatusDto {
  @ApiProperty({
    type: String,
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    type: String,
    example: 'zsxq_all_20260504093821_extracted.json',
  })
  sourceFile: string;

  @ApiPropertyOptional({
    type: String,
    example: 'zsxq_parser',
  })
  parser?: string | null;

  @ApiProperty({
    type: Number,
    example: 182,
  })
  totalItems: number;

  @ApiProperty({
    type: Number,
    example: 180,
  })
  successItems: number;

  @ApiProperty({
    type: Number,
    example: 2,
  })
  failedItems: number;

  @ApiProperty({
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    example: 'completed',
  })
  status: string;

  @ApiPropertyOptional({
    type: String,
    required: false,
  })
  errorMessage?: string | null;

  @ApiPropertyOptional({
    type: Date,
    required: false,
  })
  startedAt?: Date | null;

  @ApiPropertyOptional({
    type: Date,
    required: false,
  })
  completedAt?: Date | null;

  @ApiProperty({
    type: Date,
    example: '2026-05-13T10:00:00Z',
  })
  createdAt: Date;
}

export class JobListQueryDto {
  @ApiPropertyOptional({
    type: Number,
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({
    type: Number,
    example: 20,
  })
  @IsOptional()
  @IsNumber()
  pageSize?: number;

  @ApiPropertyOptional({
    type: String,
    example: 'completed',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    type: String,
    example: '2026-05-01',
  })
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @ApiPropertyOptional({
    type: String,
    example: '2026-05-13',
  })
  @IsOptional()
  @IsString()
  dateTo?: string;
}
