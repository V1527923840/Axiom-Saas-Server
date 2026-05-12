import { ApiProperty } from '@nestjs/swagger';
import databaseConfig from '../../database/config/database.config';
import { DatabaseConfig } from '../../database/config/database-config.type';

// <database-block>
const idType = (databaseConfig() as DatabaseConfig).isDocumentDatabase
  ? String
  : Number;
// </database-block>

export class Subscription {
  @ApiProperty({
    type: idType,
  })
  id: number | string;

  @ApiProperty({
    type: Number,
    example: 1,
  })
  userId: number;

  @ApiProperty({
    type: String,
    example: 'plan-uuid',
  })
  planId: string;

  @ApiProperty({
    type: String,
    example: '基础套餐/年',
  })
  planName: string;

  @ApiProperty({
    type: String,
    example: 'yearly',
  })
  cycle: string;

  @ApiProperty({
    type: Number,
    example: 299,
  })
  price: number;

  @ApiProperty()
  subscribedAt: Date;

  @ApiProperty()
  expiredAt: Date;

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
