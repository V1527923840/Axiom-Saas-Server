import { ApiProperty } from '@nestjs/swagger';

export class ContentItemMetaDto {
  @ApiProperty({ example: 'b2c8d2c0-1f4d-4a3a-9b3a-1b6f1a2a0001' })
  id!: string;

  @ApiProperty({ example: '康方生物双抗 ADC 临床数据更新' })
  title!: string;

  @ApiProperty({ example: 'STRUCTURED_DAILY' })
  categoryCode!: string;

  @ApiProperty({
    example: '2026-08-10T08:30:00.000Z',
    description:
      "帖文来源为 'YYYY-MM-DD'（pg date 列驱动返回字符串），研报来源为 ISO8601。",
  })
  publishDate!: string;
}

export class SourcesResponseDto {
  @ApiProperty({ type: [ContentItemMetaDto] })
  posts!: ContentItemMetaDto[];

  @ApiProperty({ type: [ContentItemMetaDto] })
  research!: ContentItemMetaDto[];

  @ApiProperty({
    type: Number,
    example: 368,
    description: '去重后的帖文来源总数（不受 limit 截断影响）。',
  })
  postsTotal!: number;

  @ApiProperty({
    type: Number,
    example: 12,
    description: '去重后的研报来源总数（不受 limit 截断影响）。',
  })
  researchTotal!: number;

  @ApiProperty({
    type: [String],
    example: [],
    description:
      '在源表（zsxq_posts + research_analysis）中查不到的 id 合并去重后的列表。' +
      '前端据此区分"真缺失"与标题恰好叫 (missing) 的行。',
  })
  missingIds!: string[];
}
