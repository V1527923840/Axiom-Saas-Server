import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { Subscription } from '../domain/subscription';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

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

export class QuerySubscriptionDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 'active', type: String })
  @IsOptional()
  @IsIn(['active', 'expired', 'cancelled'])
  status?: string;

  @ApiPropertyOptional({ example: 'user-uuid', type: String })
  @IsOptional()
  @IsString()
  userId?: string;
}
