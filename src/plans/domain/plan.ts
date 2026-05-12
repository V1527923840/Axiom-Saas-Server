import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import databaseConfig from '../../database/config/database.config';
import { DatabaseConfig } from '../../database/config/database-config.type';

// <database-block>
const idType = (databaseConfig() as DatabaseConfig).isDocumentDatabase
  ? String
  : Number;
// </database-block>

export class Plan {
  @ApiProperty({
    type: idType,
  })
  id: number | string;

  @ApiProperty({
    type: String,
    example: '基础套餐/月',
  })
  name: string;

  @ApiProperty({
    type: String,
    example: 'Lv1',
  })
  tier: string;

  @ApiProperty({
    type: String,
    example: 'monthly',
  })
  cycle: string;

  @ApiProperty({
    type: Number,
    example: 100,
  })
  pointsQuota: number;

  @ApiProperty({
    type: Number,
    example: 50,
  })
  chatQuota: number;

  @ApiProperty({
    type: Number,
    example: 29,
  })
  price: number;

  @ApiPropertyOptional({
    type: Number,
    example: 19,
  })
  promotionalPrice?: number | null;

  @ApiPropertyOptional({
    type: String,
    example: '基础订阅套餐，适合日常使用',
  })
  description?: string | null;

  @ApiProperty({
    type: String,
    example: 'active',
  })
  status: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  deletedAt?: Date;
}
