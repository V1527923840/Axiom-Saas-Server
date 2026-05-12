import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class PlanDto {
  @ApiProperty({
    type: String,
    example: 'planId',
  })
  @IsNotEmpty()
  id: string | number;
}
