import { ApiProperty } from '@nestjs/swagger';

export class ContentCategory {
  @ApiProperty({
    type: String,
    example: 'cbcfa8b8-3a25-4adb-a9c6-e325f0d0f3ae',
  })
  id: string;

  @ApiProperty({
    type: String,
    example: '每日消息',
  })
  name: string;

  @ApiProperty({
    type: String,
    example: 'daily-news',
  })
  code: string;

  @ApiProperty({
    type: String,
    example: '每日资讯新闻内容',
    required: false,
  })
  description?: string | null;

  @ApiProperty({
    type: Number,
    example: 1,
  })
  sortOrder: number;

  @ApiProperty({
    type: Boolean,
    example: true,
  })
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
