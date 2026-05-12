import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class SubscriptionDto {
  @ApiProperty({
    type: String,
    example: 'subscriptionId',
  })
  @IsNotEmpty()
  id: string | number;
}
