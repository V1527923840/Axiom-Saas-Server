import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class LatestQueryDto {
  @ApiProperty({
    enum: ['daily', 'weekly'],
    example: 'daily',
    description: 'Summary frequency bucket to fetch the latest for.',
  })
  @IsIn(['daily', 'weekly'])
  frequency!: 'daily' | 'weekly';
}
