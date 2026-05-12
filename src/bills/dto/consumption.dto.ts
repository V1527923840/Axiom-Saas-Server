import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsIn,
} from 'class-validator';

export class CreateConsumptionDto {
  @ApiProperty({ type: Number })
  @IsNotEmpty()
  @IsNumber()
  userId: number;

  @ApiProperty({ type: String })
  @IsNotEmpty()
  @IsString()
  userName: string;

  @ApiProperty({ type: String })
  @IsNotEmpty()
  @IsString()
  userEmail: string;

  @ApiProperty({ enum: ['chat', 'redeem', 'other'] })
  @IsNotEmpty()
  @IsIn(['chat', 'redeem', 'other'])
  consumeType: 'chat' | 'redeem' | 'other';

  @ApiProperty({ type: Number })
  @IsNotEmpty()
  @IsNumber()
  points: number;

  @ApiProperty({ type: Number })
  @IsNotEmpty()
  @IsNumber()
  balance: number;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  businessId?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  businessType?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  description?: string;
}
