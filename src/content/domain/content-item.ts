import { ApiProperty } from '@nestjs/swagger';

export class ContentItem {
  @ApiProperty({
    type: String,
    example: 'cbcfa8b8-3a25-4adb-a9c6-e325f0d0f3ae',
  })
  id: string;

  @ApiProperty({
    type: String,
    example: 'cbcfa8b8-3a25-4adb-a9c6-e325f0d0f3ae',
  })
  categoryId: string;

  @ApiProperty({
    type: String,
    example: '金融行业每日动态',
  })
  title: string;

  @ApiProperty({
    type: String,
    example: '今日金融市场呈现上涨趋势...',
    required: false,
  })
  summary?: string | null;

  @ApiProperty({
    type: String,
    example: '原文内容...',
    required: false,
  })
  originalContent?: string | null;

  @ApiProperty({
    type: String,
    example: 'https://minio-url/content/daily-news/2026/04/uuid/report.pdf',
    required: false,
  })
  sourceFileUrl?: string | null;

  @ApiProperty({
    type: String,
    example: 'https://minio-url/content/daily-news/2026/04/uuid/data.json',
    required: false,
  })
  jsonFileUrl?: string | null;

  @ApiProperty({
    type: String,
    example: 'https://minio-url/content/daily-news/2026/04/uuid/summary.md',
    required: false,
  })
  summaryFileUrl?: string | null;

  @ApiProperty({
    type: [String],
    example: [
      'https://example.com/image1.jpg',
      'https://example.com/image2.jpg',
    ],
    required: false,
  })
  images?: string[];

  @ApiProperty({
    type: String,
    example:
      'https://minio-url/content/audio-interpretation/2026/04/uuid/audio.mp3',
    required: false,
  })
  audioUrl?: string | null;

  @ApiProperty({
    type: String,
    example: '音频转文字的解析原文...',
    required: false,
  })
  transcript?: string | null;

  @ApiProperty({
    required: false,
  })
  publishedAt?: Date | null;

  @ApiProperty()
  collectedAt: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({
    type: String,
    example: 'active',
  })
  status: string;

  @ApiProperty({
    type: Object,
    example: {},
    required: false,
  })
  metadata?: Record<string, any>;

  @ApiProperty({
    required: false,
  })
  deletedAt?: Date | null;
}
