import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsArray,
  IsDateString,
  IsObject,
} from 'class-validator';

export class CreateContentDto {
  @ApiProperty({
    type: String,
    example: '金融行业每日动态',
  })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiPropertyOptional({
    type: String,
    example: '今日金融市场呈现上涨趋势...',
  })
  @IsOptional()
  @IsString()
  summary?: string | null;

  @ApiPropertyOptional({
    type: String,
    example: '原文内容...',
  })
  @IsOptional()
  @IsString()
  originalContent?: string | null;

  @ApiPropertyOptional({
    type: [String],
    example: ['https://example.com/image1.jpg'],
  })
  @IsOptional()
  @IsArray()
  images?: string[];

  @ApiPropertyOptional({
    type: String,
    example: 'https://minio-url/audio.mp3',
  })
  @IsOptional()
  @IsString()
  audioUrl?: string | null;

  @ApiPropertyOptional({
    type: String,
    example: '音频转文字的解析原文...',
  })
  @IsOptional()
  @IsString()
  transcript?: string | null;

  @ApiPropertyOptional({
    type: String,
    example: '2026-04-29T10:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  publishedAt?: string | null;

  @ApiPropertyOptional({
    type: Object,
    example: { source: 'agent', author: 'John' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    type: String,
    example: 'https://minio-url/source.pdf',
  })
  @IsOptional()
  @IsString()
  sourceFileUrl?: string | null;

  @ApiPropertyOptional({
    type: String,
    example: 'https://minio-url/data.json',
  })
  @IsOptional()
  @IsString()
  jsonFileUrl?: string | null;

  @ApiPropertyOptional({
    type: String,
    example: 'https://minio-url/summary.md',
  })
  @IsOptional()
  @IsString()
  summaryFileUrl?: string | null;
}
