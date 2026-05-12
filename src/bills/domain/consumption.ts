import { ApiProperty } from '@nestjs/swagger';
import { Allow } from 'class-validator';

export type ConsumeType = 'chat' | 'redeem' | 'other';

export class Consumption {
  @Allow()
  @ApiProperty({ type: String })
  id?: string;

  @Allow()
  @ApiProperty({ type: Number })
  userId: number;

  @Allow()
  @ApiProperty({ type: String })
  userName: string;

  @Allow()
  @ApiProperty({ type: String })
  userEmail: string;

  @Allow()
  @ApiProperty({ enum: ['chat', 'redeem', 'other'] })
  consumeType: ConsumeType;

  @Allow()
  @ApiProperty({ type: Number })
  points: number;

  @Allow()
  @ApiProperty({ type: Number })
  balance: number;

  @Allow()
  @ApiProperty({ type: String, nullable: true })
  businessId: string | null;

  @Allow()
  @ApiProperty({ type: String, nullable: true })
  businessType: string | null;

  @Allow()
  @ApiProperty({ type: String, nullable: true })
  description: string | null;

  @Allow()
  @ApiProperty()
  createdAt: Date;

  @Allow()
  @ApiProperty()
  updatedAt: Date;
}
