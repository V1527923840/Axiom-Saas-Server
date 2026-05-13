import { ApiProperty } from '@nestjs/swagger';

export enum EtlJobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export class EtlJob {
  @ApiProperty({
    type: String,
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    type: String,
    example: 'zsxq_all_20260504093821_extracted.json',
  })
  sourceFile: string;

  @ApiProperty({
    type: String,
    example: 'zsxq_parser',
    required: false,
  })
  parser?: string | null;

  @ApiProperty({
    type: Number,
    example: 182,
  })
  totalItems: number;

  @ApiProperty({
    type: Number,
    example: 180,
  })
  successItems: number;

  @ApiProperty({
    type: Number,
    example: 2,
  })
  failedItems: number;

  @ApiProperty({
    type: String,
    enum: EtlJobStatus,
    example: 'completed',
  })
  status: EtlJobStatus;

  @ApiProperty({
    type: String,
    required: false,
  })
  errorMessage?: string | null;

  @ApiProperty({
    type: Date,
    required: false,
  })
  startedAt?: Date | null;

  @ApiProperty({
    type: Date,
    required: false,
  })
  completedAt?: Date | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
