import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({
    type: String,
    example: '行业深度',
  })
  @IsString()
  name: string;

  @ApiProperty({
    type: String,
    example: 'INDUSTRY_DEEP',
  })
  @IsString()
  code: string;

  @ApiProperty({
    type: String,
    example: 'info_type',
    description: 'Layer: carrier, info_type, or financial',
  })
  @IsString()
  layer: string;

  @ApiPropertyOptional({
    type: String,
    example: 'RESEARCH_REPORT',
    description: 'Parent category code',
  })
  @IsOptional()
  @IsString()
  parentCode?: string;

  @ApiPropertyOptional({
    type: String,
    example: '行业深度研究报告',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    type: Number,
    example: 2,
  })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @ApiPropertyOptional({
    type: Boolean,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateCategoryDto {
  @ApiPropertyOptional({
    type: String,
    example: '行业深度报告',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    type: String,
    example: 'info_type',
  })
  @IsOptional()
  @IsString()
  layer?: string;

  @ApiPropertyOptional({
    type: String,
    example: 'RESEARCH_REPORT',
  })
  @IsOptional()
  @IsString()
  parentCode?: string;

  @ApiPropertyOptional({
    type: String,
    example: '行业深度研究报告',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    type: Number,
    example: 3,
  })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @ApiPropertyOptional({
    type: Boolean,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    type: Object,
    example: {},
  })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class QueryCategoryDto {
  @ApiPropertyOptional({
    type: String,
    example: 'info_type',
    description: 'Filter by layer: carrier, info_type, financial',
  })
  @IsOptional()
  @IsString()
  layer?: string;

  @ApiPropertyOptional({
    type: String,
    example: 'RESEARCH_REPORT',
    description: 'Filter by parent category code',
  })
  @IsOptional()
  @IsString()
  parentCode?: string;

  @ApiPropertyOptional({
    type: Boolean,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CategoryResponseDto {
  @ApiProperty({
    type: String,
    example: '770e8400-e29b-41d4-a716-446655440001',
  })
  id: string;

  @ApiProperty({
    type: String,
    example: '非结构化短文本',
  })
  name: string;

  @ApiProperty({
    type: String,
    example: 'UNSTRUCTURED_TEXT',
  })
  code: string;

  @ApiProperty({
    type: String,
    example: 'carrier',
  })
  layer: string;

  @ApiPropertyOptional({
    type: String,
    example: null,
  })
  parentCode?: string | null;

  @ApiPropertyOptional({
    type: String,
    example: '快讯、推送等短文本内容',
  })
  description?: string | null;

  @ApiProperty({
    type: Number,
    example: 3,
  })
  sortOrder: number;

  @ApiProperty({
    type: Boolean,
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    type: Object,
    example: {},
  })
  metadata: Record<string, any>;

  @ApiProperty({
    type: Date,
    example: '2026-05-13T00:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    type: Date,
    example: '2026-05-13T00:00:00Z',
  })
  updatedAt: Date;
}
