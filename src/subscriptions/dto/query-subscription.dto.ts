import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  IsIn,
  ValidateNested,
} from 'class-validator';
import { Transform, Type, plainToInstance } from 'class-transformer';
import { Subscription } from '../domain/subscription';

export class FilterSubscriptionDto {
  @ApiPropertyOptional({ example: 'active', type: String })
  @IsOptional()
  @IsIn(['active', 'expired', 'cancelled'])
  status?: string;

  @ApiPropertyOptional({ example: 'user-uuid', type: String })
  @IsOptional()
  @IsString()
  userId?: string;
}

export class SortSubscriptionDto {
  @ApiProperty()
  @Type(() => String)
  @IsString()
  orderBy: keyof Subscription;

  @ApiProperty()
  @IsString()
  order: string;
}

export class QuerySubscriptionDto {
  @ApiPropertyOptional()
  @Transform(({ value }) => (value ? Number(value) : 1))
  @IsNumber()
  @IsOptional()
  page?: number;

  @ApiPropertyOptional()
  @Transform(({ value }) => (value ? Number(value) : 10))
  @IsNumber()
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @Transform(({ value }) =>
    value
      ? plainToInstance(FilterSubscriptionDto, JSON.parse(value))
      : undefined,
  )
  @ValidateNested()
  @Type(() => FilterSubscriptionDto)
  filters?: FilterSubscriptionDto | null;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @Transform(({ value }) => {
    return value
      ? plainToInstance(SortSubscriptionDto, JSON.parse(value))
      : undefined;
  })
  @ValidateNested({ each: true })
  @Type(() => SortSubscriptionDto)
  sort?: SortSubscriptionDto[] | null;
}
