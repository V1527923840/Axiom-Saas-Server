import { ApiProperty } from '@nestjs/swagger';

export class Category {
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

  @ApiProperty({
    type: String,
    example: null,
    required: false,
  })
  parentCode?: string | null;

  @ApiProperty({
    type: String,
    example: '快讯、推送等短文本内容',
    required: false,
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
    required: false,
  })
  metadata?: Record<string, any>;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
