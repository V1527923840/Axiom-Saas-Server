import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsUUID,
  IsOptional,
  IsNumber,
  IsString,
} from 'class-validator';

export class UpgradeSubscriptionDto {
  @ApiProperty({ example: 'new-plan-uuid', type: String })
  @IsNotEmpty()
  @IsUUID()
  newPlanId: string;

  @ApiPropertyOptional({ example: '高级套餐', type: String })
  @IsOptional()
  @IsString()
  newPlanName?: string;

  @ApiPropertyOptional({ example: 99, type: Number })
  @IsOptional()
  @IsNumber()
  newPrice?: number;
}
