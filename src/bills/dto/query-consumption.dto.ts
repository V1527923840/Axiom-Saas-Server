import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { Consumption } from '../domain/consumption';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class FilterConsumptionDto {
  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @IsNumber()
  userId?: number;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  userName?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  userEmail?: string;

  @ApiPropertyOptional({ enum: ['chat', 'redeem', 'other'] })
  @IsOptional()
  @IsIn(['chat', 'redeem', 'other'])
  consumeType?: 'chat' | 'redeem' | 'other';

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  dateTo?: string;
}

export class SortConsumptionDto {
  @ApiProperty()
  @Type(() => String)
  @IsString()
  orderBy: keyof Consumption;

  @ApiProperty()
  @IsString()
  order: 'ASC' | 'DESC';
}

export class QueryConsumptionDto extends PaginationQueryDto {
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  userName?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  userEmail?: string;

  @ApiPropertyOptional({ enum: ['chat', 'redeem', 'other'] })
  @IsOptional()
  @IsIn(['chat', 'redeem', 'other'])
  consumeType?: 'chat' | 'redeem' | 'other';

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  dateTo?: string;
}
