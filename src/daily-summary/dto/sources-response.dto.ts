import { ApiProperty } from '@nestjs/swagger';

export class ContentItemMetaDto {
  @ApiProperty({ example: 'b2c8d2c0-1f4d-4a3a-9b3a-1b6f1a2a0001' })
  id!: string;

  @ApiProperty({ example: '康方生物双抗 ADC 临床数据更新' })
  title!: string;

  @ApiProperty({ example: 'STRUCTURED_DAILY' })
  categoryCode!: string;

  @ApiProperty({ example: '2026-08-10T08:30:00.000Z' })
  publishDate!: string;

  @ApiProperty({
    required: false,
    nullable: true,
    example: 'https://cdn.example.com/source.pdf',
  })
  sourceFileUrl?: string | null;
}

export class SourcesResponseDto {
  @ApiProperty({ type: [ContentItemMetaDto] })
  posts!: ContentItemMetaDto[];

  @ApiProperty({ type: [ContentItemMetaDto] })
  research!: ContentItemMetaDto[];
}
