import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateParseTaskDto {
  @ApiProperty({ description: 'Data source identifier', example: 'zsxq' })
  @IsString()
  source: string;

  @ApiProperty({
    description: 'Version string',
    example: '20260515-202605151455-04',
  })
  @IsString()
  version: string;

  @ApiPropertyOptional({
    description: 'Source file key in MinIO',
    example: 'zsxq/20260515-202605151455-04/zsxq_all.md',
  })
  @IsString()
  @IsOptional()
  sourceFileKey?: string;

  @ApiPropertyOptional({
    description: 'Whether to execute immediately',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  executeImmediately?: boolean;
}

export class ParseTaskQueryDto {
  @ApiPropertyOptional({ description: 'Filter by source', example: 'zsxq' })
  @IsString()
  @IsOptional()
  source?: string;

  @ApiPropertyOptional({ description: 'Filter by status', example: 'pending' })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 50 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 50;
}

export class ExecuteParseTaskDto {
  @ApiPropertyOptional({ description: 'Parser to use', example: 'zsxq-parser' })
  @IsString()
  @IsOptional()
  parser?: string;
}
